<?php
declare(strict_types=1);
namespace App;
use Symfony\Component\HttpFoundation\{Request,JsonResponse};
use Symfony\Component\Routing\Attribute\Route;
final class ApiController {
    public function __construct(private Auth $auth,private ProfileService $profiles,private Content $content,private Database $database,private CommunityService $community) {}
    #[Route('/api/v1/{path}',name:'api',requirements:['path'=>'.*'])]
    public function __invoke(Request $r,string $path): JsonResponse {
        try {
            $this->auth->guardHost($r);
            // PHP/proxy limits are additional protection; enforce our own limit too.
            if ((int)$r->headers->get('Content-Length','0')>65536 || strlen($r->getContent())>65536) throw new ApiError(413,'Request is too large.');
            $method=$r->getMethod(); $body=[];
            if (!in_array($method,['GET','POST','DELETE'],true)) throw new ApiError(405,'Method is not allowed.');
            if ($method!=='GET') {
                $this->auth->guardOrigin($r);
                if (strtolower(trim(explode(';',$r->headers->get('Content-Type',''))[0]))!=='application/json') throw new ApiError(415,'Use application/json.');
                try { $object=json_decode($r->getContent(),false,64,JSON_THROW_ON_ERROR); }
                catch (\JsonException) { throw new ApiError(400,'Invalid JSON.'); }
                if (!$object instanceof \stdClass) throw new ApiError(422,'Request must be a JSON object.');
                if (property_exists($object,'args') && !$object->args instanceof \stdClass) throw new ApiError(422,'Command args must be a JSON object.');
                $body=json_decode($r->getContent(),true,64,JSON_THROW_ON_ERROR);
            }
            if ($r->query->count()>0 && !($method==='GET' && $path==='leaderboard')) throw new ApiError(422,'Query parameters are not supported.');
            // REMOTE_ADDR by default; forwarded client IPs are deliberately not trusted.
            $ip=$r->getClientIp() ?? 'unknown';
            $this->auth->limit('http:'.$ip,600,60);
            $result=match($method.' '.$path) {
                'GET health'=>$this->health(),
                'POST guests'=>$this->guest($r,$body,$ip),
                'POST auth/login-link'=>$this->loginLink($r,$body,$ip),
                'POST auth/confirm'=>$this->confirm($r,$body,$ip),
                'POST auth/logout'=>$this->logout($r,$body,false),
                'POST auth/revoke-all'=>$this->logout($r,$body,true),
                'GET profile'=>$this->profiles->get($r),
                'POST actions'=>$this->profiles->action($r,$body),
                'DELETE account'=>$this->delete($r,$body),
                'GET leaderboard'=>$this->community->leaderboard($r),
                'GET content'=>$this->content->data,
                default=>$method==='GET' && preg_match('~^villages/([a-f0-9]{32})$~D',$path,$match) ? $this->community->visit($r,$match[1]) : throw new ApiError(404,'Endpoint not found.'),
            };
            $response=$result instanceof JsonResponse ? $result : new JsonResponse($result);
        } catch (ApiError $e) { $response=new JsonResponse(['error'=>$e->getMessage()],$e->status); }
        catch (\Throwable) {
            // Never log request bodies, cookies, DSNs or exception messages.
            error_log('api_request_failed');
            $response=new JsonResponse(['error'=>'The server could not complete this request. Please try again.'],500);
        }
        $response->headers->set('Cache-Control','no-store, private');
        $response->headers->set('X-Content-Type-Options','nosniff');
        $response->headers->set('Referrer-Policy','no-referrer');
        $response->headers->set('Cross-Origin-Resource-Policy','same-origin');
        $response->headers->set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
        if ($response->getStatusCode()===429) $response->headers->set('Retry-After','60');
        return $response;
    }
    private function health(): array { $this->database->get()->fetchOne('SELECT 1'); return ['ok'=>true]; }
    private function guest(Request $r,array $body,string $ip): JsonResponse {
        ProfileService::keys($body,[]); $this->auth->limit('guest:'.$ip,20,3600); return $this->auth->guest($r);
    }
    private function loginLink(Request $r,array $body,string $ip): array {
        $this->auth->limit('mail:'.$ip,20,3600); return $this->auth->loginLink($r,$body);
    }
    private function confirm(Request $r,array $body,string $ip): JsonResponse {
        $this->auth->limit('confirm:'.$ip,30,900); return $this->auth->confirm($r,$body);
    }
    private function logout(Request $r,array $body,bool $all): JsonResponse {
        ProfileService::keys($body,[]); return $this->auth->logout($r,$all);
    }
    private function delete(Request $r,array $body): JsonResponse {
        $this->profiles->delete($r,$body); return $this->auth->clearCookie();
    }
}
