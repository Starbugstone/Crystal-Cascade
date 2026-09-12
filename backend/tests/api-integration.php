<?php
declare(strict_types=1);
// Runs only against an explicitly supplied disposable test database; never truncates it.
require dirname(__DIR__).'/vendor/autoload.php';
use App\{Auth,Content,Database,Kernel};
use Symfony\Component\HttpFoundation\Request;
$testUrl=getenv('TEST_DATABASE_URL');
if (!$testUrl) { fwrite(STDERR,"Set TEST_DATABASE_URL to a disposable migrated database.\n"); exit(2); }
$_ENV['DATABASE_URL']=$testUrl;
$_ENV['APP_ORIGIN']='http://localhost:8187';
$_ENV['APP_SECRET']=str_repeat('integration-test-only-',3);
$_ENV['MAILER_DSN']='null://null'; $_ENV['MAIL_FROM']='test@example.test';
$_ENV['TRUSTED_PROXIES']='';
$database=new Database(); $db=$database->get(); $auth=new Auth($database,new Content());
$kernel=new Kernel('test',false); $cookies=[]; $csrf=''; $count=0; $players=[];
$ip='127.'.random_int(1,254).'.'.random_int(1,254).'.'.random_int(1,254);
function ensure(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); }
function callApi(string $method,string $path,mixed $body=null,array $headers=[],?array $jar=null): array {
    global $kernel,$cookies,$csrf,$ip,$count;
    $server=array_merge(['REMOTE_ADDR'=>$ip,'CONTENT_TYPE'=>'application/json','HTTP_ORIGIN'=>$_ENV['APP_ORIGIN'],'HTTP_X_CSRF_TOKEN'=>$csrf],$headers);
    $request=Request::create($_ENV['APP_ORIGIN'].'/api/v1/'.$path,$method,[],$jar??$cookies,[],$server,$body===null ? null : (is_string($body) ? $body : json_encode($body,JSON_THROW_ON_ERROR)));
    if (isset($headers['HTTP_HOST'])) $request->headers->set('Host',$headers['HTTP_HOST']);
    $response=$kernel->handle($request); $kernel->terminate($request,$response);
    foreach($response->headers->getCookies() as $cookie) $cookies[$cookie->getName()]=$cookie->getValue();
    $decoded=json_decode($response->getContent(),true,512,JSON_THROW_ON_ERROR);
    if (isset($decoded['csrf'])) $csrf=$decoded['csrf'];
    $count++;
    return [$response->getStatusCode(),$decoded,$response->getContent(),$response];
}
function expect(int $status,array $result,string $label): array { ensure($result[0]===$status,$label.' (HTTP '.$result[0].')'); return $result; }
function intent(string $email,?string $guest=null,?string $session=null): string {
    global $db,$auth;
    $token=bin2hex(random_bytes(32));
    $db->insert('login_intents',['token_hash'=>$auth->hash($token),'email'=>$email,'guest_id'=>$guest,'session_hash'=>$session,'expires_at'=>time()+900]);
    return $token;
}
try {
    expect(200,callApi('GET','health'),'Health route');
    expect(401,callApi('GET','profile'),'Unauthenticated profile');
    expect(403,callApi('POST','guests',(object)[],['HTTP_ORIGIN'=>'https://attacker.example']),'Origin guard');
    expect(400,callApi('POST','guests',(object)[],['HTTP_HOST'=>'attacker.example']),'Host guard');
    expect(415,callApi('POST','guests',(object)[],['CONTENT_TYPE'=>'text/plain']),'Content type guard');
    expect(413,callApi('POST','guests',str_repeat(' ',65537)),'Payload limit');
    expect(422,callApi('POST','guests',['playerId'=>'attacker']),'Guest field allowlist');
    expect(200,callApi('POST','guests',(object)[]),'Guest creation');
    $first=expect(200,callApi('GET','profile'),'Guest profile')[1]; $players[]=$first['playerId'];
    ensure($first['contentVersion']===(new Content())->data['version'],'Current content version advertised');
    $guestCookies=$cookies; $guestCsrf=$csrf;
    expect(200,callApi('POST','guests',(object)[]),'Guest retry');
    ensure(callApi('GET','profile')[1]['playerId']===$first['playerId'],'Guest identity survives retry');
    // Read-only income projection must not create revisions or write to the stored wallet.
    $originalProfile=$db->fetchOne('SELECT profile FROM players WHERE id=?',[$first['playerId']]);
    $incomeFixture=json_decode($originalProfile,true,512,JSON_THROW_ON_ERROR);
    foreach(['saloon','well','farm','home'] as $building) $incomeFixture['town']['buildings'][$building]=1;
    $incomeFixture['town']['income']=['at'=>(int)floor(microtime(true)*1000)-3600000,'stored'=>0,'remainder'=>0];
    $fixtureJson=json_encode($incomeFixture,JSON_THROW_ON_ERROR);
    $db->update('players',['profile'=>$fixtureJson],['id'=>$first['playerId']]);
    $beforeProjection=$db->fetchAssociative('SELECT profile,revision,saved_at FROM players WHERE id=?',[$first['playerId']]);
    $projected=expect(200,callApi('GET','profile'),'Read-only income projection')[1];
    ensure($projected['profile']['town']['income']['stored']>0,'Elapsed income is displayed');
    ensure($projected['profile']['town']['coins']===$incomeFixture['town']['coins'],'Projection cannot credit wallet');
    ensure($projected['revision']===0,'Projection keeps current revision');
    ensure($db->fetchAssociative('SELECT profile,revision,saved_at FROM players WHERE id=?',[$first['playerId']])===$beforeProjection,'Projection leaves persisted profile and save metadata unchanged');
    ensure((int)$db->fetchOne('SELECT COUNT(*) FROM ledger WHERE player_id=?',[$first['playerId']])===0,'Projection creates no economy mutation');
    $db->update('players',['profile'=>$originalProfile],['id'=>$first['playerId']]);
    $command=['actionId'=>bin2hex(random_bytes(16)),'revision'=>0,'type'=>'preferences','args'=>['locale'=>'fr']];
    expect(403,callApi('POST','actions',$command,['HTTP_X_CSRF_TOKEN'=>'wrong']),'CSRF guard');
    expect(409,callApi('POST','actions',$command,['HTTP_X_PLAYER_ID'=>'different-account']),'Queued action account binding');
    $saved=expect(200,callApi('POST','actions',$command,['HTTP_X_PLAYER_ID'=>$first['playerId'],'HTTP_X_CONTENT_VERSION'=>$first['contentVersion']]),'Preferences action');
    ensure($saved[1]['revision']===1,'Revision increment');
    ensure(str_contains($saved[2],'"records":{}'),'Dictionary response encoding');
    $reordered=['args'=>['locale'=>'fr'],'type'=>'preferences','revision'=>0,'actionId'=>$command['actionId']];
    $retry=expect(200,callApi('POST','actions',$reordered),'Canonical idempotency retry');
    ensure($retry[2]===$saved[2],'Receipt preserves JSON dictionaries and exact result');
    ensure(expect(200,callApi('POST','actions',$reordered,['HTTP_X_CONTENT_VERSION'=>'older-client']),'Historical receipt survives version mismatch')[2]===$saved[2],'Historical receipt unchanged');
    $versioned=$command; $versioned['actionId']=bin2hex(random_bytes(16)); $versioned['revision']=1;
    expect(409,callApi('POST','actions',$versioned,['HTTP_X_CONTENT_VERSION'=>'older-client']),'New action version mismatch rejected');
    $changed=$command; $changed['args']['locale']='en';
    expect(409,callApi('POST','actions',$changed),'Action ID content binding');
    $changed['actionId']=bin2hex(random_bytes(16)); expect(409,callApi('POST','actions',$changed),'Stale revision');
    $changed['revision']=1; $changed['playerId']='other'; expect(422,callApi('POST','actions',$changed),'Ownership payload rejected');
    expect(422,callApi('POST','actions',['actionId'=>bin2hex(random_bytes(16)),'revision'=>1,'type'=>'import','args'=>(object)[]]),'Untrusted imports rejected');

    // Treat requests as hostile even when the normal UI never generates these commands.
    $beforeAttack=$db->fetchAssociative('SELECT profile,revision FROM players WHERE id=?',[$first['playerId']]);
    $beforeReceipts=(int)$db->fetchOne('SELECT COUNT(*) FROM actions WHERE player_id=?',[$first['playerId']]);
    foreach([
        ['save',['coins'=>999999999,'records'=>['240'=>['stars'=>3]]]],
        ['reward.claim',['quantity'=>999999999]],
        ['run.complete',['level'=>240,'score'=>999999999,'elapsedMs'=>1]],
        ['run.start',['level'=>240,'mode'=>'normal']],
        ['run.start',['level'=>1,'mode'=>'normal','board'=>[]]],
        ['town.upgrade',['id'=>'well','stage'=>0,'cost'=>0]],
        ['town.finish',['id'=>'well','stage'=>1,'wins'=>99]],
        ['town.hammer',['id'=>'well','stage'=>0]],
        ['town.era',['era'=>'frontier']],
        ['town.collect',['source'=>'saloon','now'=>PHP_INT_MAX]],
        ['shop.buy',['id'=>'tnt','visit'=>0,'price'=>-100000]],
        ['preferences',['locale'=>'fr','profile'=>['town'=>['coins'=>999999999]]]],
    ] as [$type,$args]) {
        expect(422,callApi('POST','actions',['actionId'=>bin2hex(random_bytes(16)),'revision'=>1,'type'=>$type,'args'=>$args]),'Forged authority rejected: '.$type);
        ensure($db->fetchAssociative('SELECT profile,revision FROM players WHERE id=?',[$first['playerId']])===$beforeAttack,'Attack cannot change balances, inventory, records or revision');
    }
    ensure((int)$db->fetchOne('SELECT COUNT(*) FROM actions WHERE player_id=?',[$first['playerId']])===$beforeReceipts,'Rejected attacks cannot mint receipts');
    expect(422,callApi('DELETE','account',['confirmation'=>'yes']),'Deletion explicit confirmation');
    $email='integration-'.bin2hex(random_bytes(8)).'@example.test';
    $link=intent($email,$first['playerId'],$auth->hash($guestCookies[$auth->cookieName()]));
    expect(401,callApi('POST','auth/confirm',['token'=>$link],[],[]),'Link requires original guest session');
    $cookies=$guestCookies; $csrf=$guestCsrf;
    expect(200,callApi('POST','auth/confirm',['token'=>$link]),'Verified guest linking');
    $linked=expect(200,callApi('GET','profile'),'Linked profile')[1];
    ensure($linked['linked'] && $linked['playerId']===$first['playerId'],'Link preserves village');
    expect(401,callApi('POST','auth/confirm',['token'=>$link]),'One time credential');
    expect(401,callApi('GET','profile',null,[],$guestCookies),'Old session rotated');
    $linkedCookies=$cookies; $linkedCsrf=$csrf;
    $cookies=[]; $csrf=''; expect(200,callApi('POST','guests',(object)[]),'Second guest');
    $second=expect(200,callApi('GET','profile'),'Second profile')[1]; $players[]=$second['playerId'];
    $secondCookies=$cookies; $secondCsrf=$csrf;
    $conflict=intent($email,$second['playerId'],$auth->hash($cookies[$auth->cookieName()]));
    expect(409,callApi('POST','auth/confirm',['token'=>$conflict]),'Existing cloud conflict');
    ensure(callApi('GET','profile')[1]['playerId']===$second['playerId'],'Conflict retains guest identity');
    expect(200,callApi('POST','auth/confirm',['token'=>$conflict,'useExisting'=>true]),'Explicit existing village choice');
    ensure(callApi('GET','profile')[1]['playerId']===$first['playerId'],'Existing account restored on another device');
    // Mail transport is null in this isolated CLI test. Existing/unknown accounts stay neutral.
    $neutral=expect(200,callApi('POST','auth/login-link',['email'=>$email]),'Email link request')[1];
    for($attempt=0;$attempt<4;$attempt++) expect(200,callApi('POST','auth/login-link',['email'=>$email]),'Durable email rate allowance');
    expect(429,callApi('POST','auth/login-link',['email'=>$email]),'Durable email rate limit');
    $unknown='unknown-'.bin2hex(random_bytes(8)).'@example.test';
    ensure(expect(200,callApi('POST','auth/login-link',['email'=>$unknown]),'Unknown email response')[1]===$neutral,'Neutral email response');
    $db->delete('login_intents',['email'=>$unknown]);
    $pending=intent($email);
    expect(200,callApi('POST','auth/revoke-all',(object)[]),'Revoke all');
    expect(401,callApi('GET','profile',null,[],$linkedCookies),'Other device revoked');
    expect(401,callApi('POST','auth/confirm',['token'=>$pending]),'Outstanding link revoked');
    $cookies=[]; $csrf=''; $fresh=intent($email);
    expect(200,callApi('POST','auth/confirm',['token'=>$fresh]),'Verified email login');
    $pending=intent($email);
    expect(200,callApi('DELETE','account',['confirmation'=>'DELETE MY ACCOUNT']),'Delete account');
    ensure(!$db->fetchOne('SELECT id FROM players WHERE id=?',[$first['playerId']]),'Account deleted');
    foreach(['sessions','actions','ledger','runs'] as $table) ensure((int)$db->fetchOne('SELECT COUNT(*) FROM '.$table.' WHERE player_id=?',[$first['playerId']])===0,'Foreign key cascade '.$table);
    expect(401,callApi('POST','auth/confirm',['token'=>$pending]),'Deletion revokes pending links');
    echo "API integration security checks passed ($count requests).\n";
} finally {
    foreach($players as $player) {
        $db->delete('login_intents',['guest_id'=>$player]);
        $db->delete('players',['id'=>$player]);
    }
    $kernel->shutdown();
}
