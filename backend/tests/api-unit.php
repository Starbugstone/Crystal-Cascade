<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use App\{ApiError,Auth,Content,Database,ProfileService};
use Symfony\Component\HttpFoundation\Request;
function check(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); }
function rejected(callable $call,int $status): void {
    try { $call(); } catch (ApiError $e) { check($e->status===$status,'Unexpected rejection status'); return; }
    throw new RuntimeException('Expected rejection');
}
$_ENV['APP_ORIGIN']='https://village.example'; $_ENV['APP_SECRET']=str_repeat('test-secret-',4);
$auth=new Auth(new Database(),new Content());
check($auth->cookieName()==='__Host-cascade','Production cookie prefix');
$valid=Request::create('https://village.example/api/v1/profile','GET');
$auth->guardHost($valid);
rejected(fn()=>$auth->guardHost(Request::create('https://attacker.example/api/v1/profile')),400);
rejected(fn()=>$auth->guardHost(Request::create('http://village.example/api/v1/profile')),400);
rejected(fn()=>$auth->guardOrigin($valid),403);
$valid->headers->set('Origin','https://village.example'); $auth->guardOrigin($valid);
$valid->headers->set('Sec-Fetch-Site','cross-site'); rejected(fn()=>$auth->guardOrigin($valid),403);
$forged=Request::create('http://attacker.example/api/v1/profile','GET',[],[],[],['HTTP_X_FORWARDED_HOST'=>'village.example','HTTP_X_FORWARDED_PROTO'=>'https']);
rejected(fn()=>$auth->guardHost($forged),400);
check(ProfileService::fingerprint(['type'=>'preferences','args'=>['a'=>1,'b'=>2]])===ProfileService::fingerprint(['args'=>['b'=>2,'a'=>1],'type'=>'preferences']),'Canonical object order');
check(ProfileService::fingerprint(['args'=>[1,2]])!==ProfileService::fingerprint(['args'=>[2,1]]),'Array order must be preserved');
check(ProfileService::fingerprint(['args'=>['a'=>1]])!==ProfileService::fingerprint(['args'=>['a'=>1.0]]),'Distinct numeric types');
rejected(fn()=>ProfileService::integer(1.0,0,2),422);
rejected(fn()=>ProfileService::integer(-1,0,2),422);
rejected(fn()=>ProfileService::keys(['playerId'=>'other'],['locale']),422);
rejected(fn()=>ProfileService::keys(['unkeyed'],['locale']),422);
$profile=(new Content())->fresh(); $profile['town']['coins']=-10;
rejected(fn()=>ProfileService::invariants($profile),422);
echo "API unit security checks passed.\n";
