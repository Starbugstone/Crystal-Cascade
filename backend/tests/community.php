<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use App\{Auth,Content,Database,Kernel,PuzzleEngine};
use Symfony\Component\HttpFoundation\Request;
$url=getenv('TEST_DATABASE_URL');if(!$url)throw new RuntimeException('Set TEST_DATABASE_URL to a disposable migrated database.');
$_ENV['DATABASE_URL']=$url;$_ENV['APP_ORIGIN']='http://localhost:8187';$_ENV['APP_SECRET']=str_repeat('community-tests-only-',3);$_ENV['TRUSTED_PROXIES']='';
$db=(new Database())->get();$content=new Content();$auth=new Auth(new Database(),$content);$kernel=new Kernel('test',false);$players=[];$checks=0;
function check(bool $ok,string $message): void {global $checks;$checks++;if(!$ok)throw new RuntimeException($message);}
function player(bool $linked=true): array {
 global $auth,$db,$players;
 $response=$auth->guest(Request::create($_ENV['APP_ORIGIN']));$cookie=$response->headers->getCookies()[0];$id=$db->fetchOne('SELECT player_id FROM sessions WHERE token_hash=?',[$auth->hash($cookie->getValue())]);$players[]=$id;
 if($linked)$db->update('players',['email'=>$id.'@private.example.test'],['id'=>$id]);
 return ['id'=>$id,'cookie'=>[$cookie->getName()=>$cookie->getValue()],'csrf'=>json_decode($response->getContent(),true)['csrf'],'revision'=>0];
}
function call(array $client,string $method,string $path,?array $body=null,int $expected=200): array {
 global $kernel;
 $r=Request::create($_ENV['APP_ORIGIN'].'/api/v1/'.$path,$method,[],$client['cookie']??[],[],['REMOTE_ADDR'=>'127.0.0.72','CONTENT_TYPE'=>'application/json','HTTP_ORIGIN'=>$_ENV['APP_ORIGIN'],'HTTP_X_CSRF_TOKEN'=>$client['csrf']??''], $body===null?null:json_encode($body,JSON_THROW_ON_ERROR));
 $response=$kernel->handle($r);$kernel->terminate($r,$response);check($response->getStatusCode()===$expected,$method.' '.$path.' expected '.$expected.' got '.$response->getStatusCode().' '.$response->getContent());
 return json_decode($response->getContent(),true,512,JSON_THROW_ON_ERROR);
}
function action(array &$client,string $type,array $args,int $status=200): array {
 $result=call($client,'POST','actions',['actionId'=>bin2hex(random_bytes(16)),'revision'=>$client['revision'],'type'=>$type,'args'=>$args?:new stdClass()],$status);
 if($status===200)$client['revision']=$result['revision'];return $result;
}
function profile(array $client): array {global $db;return json_decode($db->fetchOne('SELECT profile FROM players WHERE id=?',[$client['id']]),true);}
function privateKeys(array $value): void {
 foreach($value as $key=>$entry) {check(!in_array($key,['playerId','player_id','email','csrf','coins','powers','builderHammers','income','forge','events','records','continuousRecords','run','runId','revision','savedAt','profile','cost','wins','required','token_hash','session_hash'],true),'Private key leaked: '.$key);if(is_array($entry))privateKeys($entry);}
}
try {
 $alice=player();$bob=player();$guest=player(false);
 call([],'GET','leaderboard',null,401);
 $initial=call($bob,'GET','leaderboard');check($initial['entries']===[]&&$initial['ownVillageId']===null,'New accounts are private');
 action($guest,'community.preferences',['listed'=>true,'villageName'=>'Guest Village'],422);
 foreach(['x','Email@example.com','<script>alert(1)</script>',str_repeat('A',41),"Bad\nName"] as $name)action($alice,'community.preferences',['listed'=>true,'villageName'=>$name],422);
 action($alice,'community.preferences',['listed'=>'true','villageName'=>'Willow Vale'],422);
 action($alice,'community.preferences',['listed'=>true,'villageName'=>'Willow Vale','score'=>999999],422);
 $private=profile($alice);$private['town']['coins']=987654;foreach(['well','farm','home'] as $id)$private['town']['buildings'][$id]=1;
 $private['town']['privateFutureField']='never-public';$private['futurePrivateField']='never-public';
 $db->update('players',['profile'=>json_encode($private)],['id'=>$alice['id']]);
 $public=action($alice,'community.preferences',['listed'=>true,'villageName'=>'Willow Vale']);
 check($public['profile']['community']['listed']===true,'Opt-in persisted');
 $listed=call($bob,'GET','leaderboard');check(count($listed['entries'])===1&&$listed['entries'][0]['name']==='Willow Vale','Opted-in village listed');
 $id=$listed['entries'][0]['villageId'];check($id!==$alice['id'],'Public identifier does not expose private player ID');
 check(call($alice,'GET','leaderboard')['ownVillageId']===$id,'Owner can identify their own listing');
 $before=$db->fetchAllAssociative('SELECT id,profile,revision,saved_at FROM players ORDER BY id');
 $visit=call($bob,'GET','villages/'.$id);privateKeys($visit);check(!str_contains(json_encode($visit),'never-public'),'Future private fields excluded');
 check($visit['appearance']['buildings']['well']===1,'Visitor sees completed building');
 call($bob,'GET','profile?playerId='.$alice['id'],null,422);call($bob,'GET','profile/'.$alice['id'],null,404);
 call($bob,'GET','villages/'.$alice['id'],null,404);call([],'GET','villages/'.$id,null,401);
 call($bob,'POST','villages/'.$id,['coins'=>0],404);call($bob,'DELETE','villages/'.$id,['confirmation'=>'DELETE MY ACCOUNT'],404);
 action($bob,'town.upgrade',['id'=>'well','stage'=>0,'villageId'=>$id],422);
 action($bob,'community.preferences',['listed'=>false,'villageName'=>'Other','playerId'=>$alice['id']],422);
 check($db->fetchAllAssociative('SELECT id,profile,revision,saved_at FROM players ORDER BY id')===$before,'Visits and attacks cannot modify either private save');
 check(call($bob,'GET','profile')['playerId']===$bob['id'],'Visitor remains on their own account');
 foreach(['?page=0','?page=-1','?page=1.5','?page[]=1','?page=10001','?coins=9'] as $query)call($bob,'GET','leaderboard'.$query,null,422);
 // Later eras precede larger villages in earlier eras; progression is derived from saved buildings.
 $p=profile($bob);$p['town']['era']='river-rail';$p['town']['buildings']['well']=1;$db->update('players',['profile'=>json_encode($p)],['id'=>$bob['id']]);
 action($bob,'community.preferences',['listed'=>true,'villageName'=>'River Town']);
 check(call($alice,'GET','leaderboard')['entries'][0]['name']==='River Town','Era is primary ranking dimension');
 $old=call($bob,'GET','villages/'.$id);action($alice,'town.upgrade',['id'=>'well','stage'=>1]);
 $building=profile($alice);if(isset($building['town']['projects']['well'])) {
  $view=call($bob,'GET','villages/'.$id);privateKeys($view);check(isset($view['appearance']['projects']['well']),'Public construction appearance updated');
 }
 // A legal server-resolved victory updates the public ranking without publishing the active board.
 $run=action($alice,'run.start',['level'=>1,'mode'=>'normal'])['run'];
 call($bob,'POST','actions',['actionId'=>bin2hex(random_bytes(16)),'revision'=>$bob['revision'],'type'=>'run.resume','args'=>['runId'=>$run['runId']]],404);
 $state=json_decode($db->fetchOne('SELECT state FROM runs WHERE id=?',[$run['runId']]),true);$engine=new PuzzleEngine();$legal=null;
 foreach($state['board'] as $a=>$gem)foreach([$a+1,$a+$state['cols']] as $b)if($b<count($state['board'])) { $evaluation=$engine->evaluate($state['board'],$state['tiles'],$state['cols'],$state['rows'],$a,$b);if($evaluation['matches']){$legal=[$a,$b,$evaluation];break 2;} }
 check($legal!==null,'Fixture has a legal move');[$a,$b,$evaluation]=$legal;
 foreach($state['tiles'] as &$tile){$tile['health']=0;unset($tile['chainHealth']);}unset($tile);
 $state['tiles'][$evaluation['matches'][0]['indices'][0]]['health']=1;$state['remainingLayers']=$state['totalLayers']=1;
 $db->update('runs',['state'=>json_encode($state)],['id'=>$run['runId']]);
 action($alice,'run.move',['runId'=>$run['runId'],'a'=>$a,'b'=>$b]);
 $won=call($bob,'GET','villages/'.$id);check($won['minesCleared']===1,'Confirmed victory updates ranking');privateKeys($won);
 action($alice,'community.preferences',['listed'=>false,'villageName'=>'Willow Vale']);call($bob,'GET','villages/'.$id,null,404);
 check(count(call($bob,'GET','leaderboard')['entries'])===1,'Opt-out removes listing immediately');
 action($alice,'community.preferences',['listed'=>true,'villageName'=>'Willow Vale']);$newId=call($alice,'GET','leaderboard')['ownVillageId'];check($newId!==$id,'Re-publishing does not resurrect an old visit URL');
 // Bounded, deterministic pagination includes ties without duplicate villages.
 for($i=0;$i<20;$i++){$extra=player();action($extra,'community.preferences',['listed'=>true,'villageName'=>'Village '.$i]);}
 $first=call($bob,'GET','leaderboard?page=1');$second=call($bob,'GET','leaderboard?page=2');
 check(count($first['entries'])===20&&$first['hasNext']&&count($second['entries'])===2&&!$second['hasNext'],'Bounded pagination');
 check(count(array_unique(array_merge(array_column($first['entries'],'villageId'),array_column($second['entries'],'villageId'))))===22,'Tied villages do not duplicate across pages');
 check($second['entries'][0]['rank']===21,'Rank continues on next page');privateKeys($first['entries']);
 call($alice,'DELETE','account',['confirmation'=>'DELETE MY ACCOUNT']);call($bob,'GET','villages/'.$newId,null,404);
 check(!$db->fetchOne('SELECT id FROM public_villages WHERE player_id=?',[$alice['id']]),'Deletion removes public projection');
 echo "Community privacy, ownership, ranking and visit checks passed: $checks assertions.\n";
} finally {
 foreach($players as $id)$db->delete('players',['id'=>$id]);$kernel->shutdown();
}
