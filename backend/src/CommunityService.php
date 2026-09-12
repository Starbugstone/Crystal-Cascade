<?php
declare(strict_types=1);
namespace App;
use Symfony\Component\HttpFoundation\Request;

/** Public projections are separate from private saves and are never accepted as commands. */
final class CommunityService {
    private const PAGE_SIZE=20;
    public function __construct(private Database $database,private Auth $auth,private Content $content,private TownService $town) {}
    public function preferences(array &$profile,array $args,bool $linked): void {
        ProfileService::keys($args,['listed','villageName']);
        if(!is_bool($args['listed']??null)||!is_string($args['villageName']??null))throw new ApiError(422,'Choose a village name and visibility.');
        $name=trim($args['villageName']);
        // Plain display text only; never derive a public name from an email address.
        if(!preg_match("/^[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N} '\x{2019}-]{1,39}$/uD",$name))throw new ApiError(422,'Use 2–40 letters, numbers, spaces, apostrophes or hyphens for your village name.');
        if($args['listed']&&!$linked)throw new ApiError(422,'Link your email before publishing your village.');
        $profile['community']=['listed'=>$args['listed'],'villageName'=>$name];
    }
    /** Called in the owner's mutation transaction, after acquiring the player lock. */
    public function sync(string $playerId,array $profile,bool $linked): void {
        $db=$this->database->get();$settings=$profile['community']??[];
        if(!$linked||!($settings['listed']??false)) {$db->delete('public_villages',['player_id'=>$playerId]);return;}
        $town=$profile['town'];$era=array_search($town['era'],array_column($this->content->data['eras'],'id'),true);
        $buildings=[];$buildingEras=[];$buildingEraLevels=[];$projects=[];$progress=0;
        foreach($this->content->data['buildings'] as $building) {
            $id=$building['id'];$buildings[$id]=(int)$town['buildings'][$id];$buildingEras[$id]=$town['buildingEras'][$id];$buildingEraLevels[$id]=(int)$town['buildingEraLevels'][$id];
            $progress+=$buildings[$id];
            if($building['introducedEra']!==$town['era']&&$buildingEras[$id]===$town['era'])$progress+=$buildingEraLevels[$id];
            if(isset($town['projects'][$id])) {
                $project=$town['projects'][$id];
                $projects[$id]=array_intersect_key($project,array_flip(['id','stage','type','targetEra','eraLevel']));
                // Publish scaffolding appearance without work counters, prices or timers.
                $projects[$id]['visualStage']=min(2,(int)ceil(3*$project['wins']/max(1,$project['required'])));
            }
        }
        $appearance=['era'=>$town['era'],'buildings'=>$buildings,'buildingEras'=>$buildingEras,'buildingEraLevels'=>$buildingEraLevels,'projects'=>(object)$projects];
        $values=['name'=>$settings['villageName'],'era_rank'=>(int)$era,'building_score'=>$progress,'mines_cleared'=>count($profile['records']),'population'=>$this->town->population($town)[0],'appearance'=>json_encode($appearance,JSON_THROW_ON_ERROR)];
        $existing=$db->fetchAssociative('SELECT * FROM public_villages WHERE player_id=?',[$playerId]);
        if($existing) {
            foreach($values as $key=>$value)if((string)$existing[$key]!== (string)$value) {$db->update('public_villages',$values,['player_id'=>$playerId]);return;}
        } else $db->insert('public_villages',$values+['id'=>bin2hex(random_bytes(16)),'player_id'=>$playerId]);
    }
    private function summary(array $row): array {
        return ['villageId'=>$row['id'],'name'=>$row['name'],'era'=>$this->content->data['eras'][(int)$row['era_rank']]['id'],'buildingProgress'=>(int)$row['building_score'],'minesCleared'=>(int)$row['mines_cleared'],'population'=>(int)$row['population']];
    }
    public function leaderboard(Request $request): array {
        $session=$this->auth->session($request);
        $query=$request->query->all();ProfileService::keys($query,['page']);$page=$query['page']??'1';
        if(!is_string($page)||!preg_match('/^[1-9][0-9]{0,4}$/D',$page)||(int)$page>10000)throw new ApiError(422,'Invalid leaderboard page.');
        $page=(int)$page;$db=$this->database->get();
        // The ranking index and fixed page size avoid loading or sorting private JSON saves.
        $rows=$db->createQueryBuilder()->select('id','name','era_rank','building_score','mines_cleared','population')->from('public_villages')
            ->orderBy('era_rank','DESC')->addOrderBy('building_score','DESC')->addOrderBy('mines_cleared','DESC')->addOrderBy('id','ASC')
            ->setFirstResult(($page-1)*self::PAGE_SIZE)->setMaxResults(self::PAGE_SIZE+1)->executeQuery()->fetchAllAssociative();
        $more=count($rows)>self::PAGE_SIZE;$rows=array_slice($rows,0,self::PAGE_SIZE);$entries=[];
        foreach($rows as $i=>$row)$entries[]=$this->summary($row)+['rank'=>($page-1)*self::PAGE_SIZE+$i+1];
        return ['entries'=>$entries,'page'=>$page,'hasNext'=>$more,'ownVillageId'=>$db->fetchOne('SELECT id FROM public_villages WHERE player_id=?',[$session['player_id']])?:null];
    }
    public function visit(Request $request,string $id): array {
        $this->auth->session($request);
        if(!preg_match('/^[a-f0-9]{32}$/D',$id))throw new ApiError(404,'Village not found.');
        $row=$this->database->get()->fetchAssociative('SELECT id,name,era_rank,building_score,mines_cleared,population,appearance FROM public_villages WHERE id=?',[$id]);
        if(!$row)throw new ApiError(404,'This village is not available for visits.');
        return $this->summary($row)+['appearance'=>json_decode($row['appearance'],false,512,JSON_THROW_ON_ERROR)];
    }
}
