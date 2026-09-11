<?php
declare(strict_types=1);
// Explicit target required: creates one disposable guest and deletes it afterward.
$origin=getenv('TEST_HTTP_ORIGIN');
if (!$origin || !preg_match('~^http://(localhost|127\.0\.0\.1):[0-9]+$~D',$origin)) { fwrite(STDERR,"Set TEST_HTTP_ORIGIN to the local review container origin.\n"); exit(2); }
$cookie=''; $csrf=''; $count=0;
function http(string $method,string $path,mixed $body=null,array $extra=[]): array {
    global $origin,$cookie,$csrf,$count;
    $headers=array_merge(['Content-Type'=>'application/json','Origin'=>$origin,'Cookie'=>$cookie,'X-CSRF-Token'=>$csrf],$extra);
    $lines=[]; foreach($headers as $name=>$value) $lines[]=$name.': '.$value;
    $context=stream_context_create(['http'=>['method'=>$method,'header'=>implode("\r\n",$lines),'content'=>$body===null?'':(is_string($body)?$body:json_encode($body,JSON_THROW_ON_ERROR)),'ignore_errors'=>true,'timeout'=>15]]);
    $raw=file_get_contents($origin.'/api/v1/'.$path,false,$context);
    if ($raw===false) throw new RuntimeException('HTTP request failed');
    $responseHeaders=$http_response_header; preg_match('/\s(\d{3})\s/',$responseHeaders[0],$matches);
    foreach($responseHeaders as $line) if(str_starts_with(strtolower($line),'set-cookie:')) $cookie=explode(';',trim(substr($line,11)))[0];
    $result=json_decode($raw,true); if(isset($result['csrf']))$csrf=$result['csrf']; $count++;
    return ['status'=>(int)$matches[1],'body'=>$result,'raw'=>$raw,'headers'=>$responseHeaders];
}
function verifyHttp(int $expected,array $result,string $message): array {
    if($result['status']!==$expected)throw new RuntimeException($message.' (HTTP '.$result['status'].')');return $result;
}
try {
    verifyHttp(200,http('GET','health'),'Health');
    verifyHttp(401,http('GET','profile'),'Authentication required');
    verifyHttp(403,http('POST','guests',(object)[],['Origin'=>'https://attacker.example']),'Cross-origin rejected');
    verifyHttp(400,http('GET','health',null,['Host'=>'attacker.example']),'Host rejected');
    verifyHttp(415,http('POST','guests',(object)[],['Content-Type'=>'text/plain']),'Content type rejected');
    verifyHttp(413,http('POST','guests',str_repeat(' ',65537)),'Body limit enforced');
    verifyHttp(422,http('POST','guests',['profile'=>['coins'=>999999]]),'Profile injection rejected');
    $guest=verifyHttp(200,http('POST','guests',(object)[]),'Guest');
    $security=strtolower(implode("\n",$guest['headers']));
    if(!str_contains($security,'httponly') || !str_contains($security,'samesite=strict') || !str_contains($security,'no-store'))throw new RuntimeException('Cookie/cache security headers missing');
    $profile=verifyHttp(200,http('GET','profile'),'Profile')['body'];
    $command=['actionId'=>bin2hex(random_bytes(16)),'revision'=>$profile['revision'],'type'=>'preferences','args'=>['locale'=>'fr']];
    verifyHttp(403,http('POST','actions',$command,['X-CSRF-Token'=>'wrong']),'CSRF rejected');
    $saved=verifyHttp(200,http('POST','actions',$command),'Action');
    $retry=verifyHttp(200,http('POST','actions',array_reverse($command,true)),'Retry');
    if($saved['raw']!==$retry['raw'] || !str_contains($retry['raw'],'"records":{}'))throw new RuntimeException('HTTP receipt mismatch');
    $command['actionId']=bin2hex(random_bytes(16));verifyHttp(409,http('POST','actions',$command),'Stale revision rejected');
    $command['revision']=$saved['body']['revision'];$command['type']='import';$command['args']=(object)[];
    verifyHttp(422,http('POST','actions',$command),'Unverified import rejected');
    verifyHttp(200,http('DELETE','account',['confirmation'=>'DELETE MY ACCOUNT']),'Delete');
    verifyHttp(401,http('GET','profile'),'Deleted session rejected');
    echo "Real HTTP API security checks passed ($count requests).\n";
} finally {
    if($cookie!=='' && $csrf!=='')http('DELETE','account',['confirmation'=>'DELETE MY ACCOUNT']);
}
