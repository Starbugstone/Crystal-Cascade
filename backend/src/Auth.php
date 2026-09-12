<?php
declare(strict_types=1);
namespace App;
use Symfony\Component\HttpFoundation\{Request, Cookie, JsonResponse};
use Symfony\Component\Mailer\{Mailer, Transport};
use Symfony\Component\Mime\Email;
final class Auth {
    public function __construct(private Database $database, private Content $content) {}
    public function origin(): string {
        $origin=$_ENV['APP_ORIGIN'] ?? getenv('APP_ORIGIN');
        if (!is_string($origin) || !preg_match('~^https?://[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$~D',$origin)) throw new \RuntimeException('APP_ORIGIN must be an exact origin.');
        if (!str_starts_with($origin,'https://') && !preg_match('~^http://(localhost|127\.0\.0\.1)(:\d+)?$~D',$origin)) throw new \RuntimeException('HTTPS is required.');
        $port=parse_url($origin,PHP_URL_PORT);
        if ($port!==null && ($port<1 || $port>65535)) throw new \RuntimeException('Invalid origin port.');
        return $origin;
    }
    private function secret(): string {
        $secret=$_ENV['APP_SECRET'] ?? getenv('APP_SECRET');
        if (!is_string($secret) || strlen($secret)<32) throw new \RuntimeException('APP_SECRET must be at least 32 bytes.');
        return $secret;
    }
    public function cookieName(): string { return str_starts_with($this->origin(),'https:') ? '__Host-cascade' : 'cascade_local'; }
    public function hash(string $value): string { return hash_hmac('sha256',$value,$this->secret()); }
    public function guardHost(Request $r): void {
        $origin=$this->origin();
        if (strtolower($r->getHost())!==strtolower(parse_url($origin,PHP_URL_HOST)) || $r->getPort()!==(parse_url($origin,PHP_URL_PORT) ?? (str_starts_with($origin,'https:') ? 443 : 80))) throw new ApiError(400,'Request host is not allowed.');
        if (str_starts_with($origin,'https:') && !$r->isSecure()) throw new ApiError(400,'HTTPS is required.');
    }
    public function guardOrigin(Request $r): void {
        if ($r->headers->get('Origin')!==$this->origin()) throw new ApiError(403,'Request origin is not allowed.');
        if ($r->headers->get('Sec-Fetch-Site')==='cross-site') throw new ApiError(403,'Cross-site request rejected.');
    }
    public function session(Request $r, bool $mutation=false): array {
        $token=$r->cookies->get($this->cookieName(),'');
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) throw new ApiError(401,'Please sign in again.');
        $session=$this->database->get()->fetchAssociative('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',[$this->hash($token),time()]);
        if (!$session) throw new ApiError(401,'Please sign in again.');
        if ($mutation && !hash_equals($session['csrf_hash'],$this->hash($r->headers->get('X-CSRF-Token','')))) throw new ApiError(403,'Refresh this page before trying again.');
        $session['csrf']=$this->hash('csrf:'.$token);
        return $session;
    }
    /** Call only after taking the player row lock, inside the same transaction. */
    public function recheck(array $session): void {
        if (!$this->database->get()->fetchOne('SELECT token_hash FROM sessions WHERE token_hash=? AND player_id=? AND expires_at>? FOR UPDATE',[$session['token_hash'],$session['player_id'],time()])) throw new ApiError(401,'Please sign in again.');
    }
    private function issue(string $player): JsonResponse {
        $token=bin2hex(random_bytes(32)); $csrf=$this->hash('csrf:'.$token);
        $this->database->get()->insert('sessions',['token_hash'=>$this->hash($token),'player_id'=>$player,'csrf_hash'=>$this->hash($csrf),'created_at'=>time(),'expires_at'=>time()+2592000]);
        $r=new JsonResponse(['csrf'=>$csrf]);
        $r->headers->setCookie(Cookie::create($this->cookieName(),$token)->withPath('/')->withSecure(str_starts_with($this->origin(),'https:'))->withHttpOnly(true)->withSameSite('strict')->withExpires(time()+2592000));
        return $r;
    }
    private function createPlayer(string $id,?string $email=null): void {
        $profile=$this->content->fresh(); $profile['town']['income']['at']=(int)floor(microtime(true)*1000);
        $this->database->get()->insert('players',['id'=>$id,'email'=>$email,'profile'=>json_encode($profile,JSON_THROW_ON_ERROR),'created_at'=>time(),'saved_at'=>time(),'revision'=>0]);
    }
    public function guest(Request $r): JsonResponse {
        try { return new JsonResponse(['csrf'=>$this->session($r)['csrf']]); } catch (ApiError $e) { if ($e->status!==401) throw $e; }
        $db=$this->database->get(); $id=bin2hex(random_bytes(16));
        return $db->transactional(function() use($id) { $this->createPlayer($id); return $this->issue($id); });
    }
    public function loginLink(Request $r,array $body): array {
        ProfileService::keys($body,['email','link']);
        if (!is_string($body['email']??null) || (array_key_exists('link',$body) && !is_bool($body['link']))) throw new ApiError(422,'Invalid sign-in request.');
        $email=strtolower(trim($body['email']));
        if (strlen($email)>254 || !filter_var($email,FILTER_VALIDATE_EMAIL)) throw new ApiError(422,'Enter a valid email address.');
        $this->limit('email:'.$email,5,3600);
        $token=bin2hex(random_bytes(32)); $db=$this->database->get();
        $db->transactional(function() use($db,$r,$body,$email,$token) {
            $guest=null; $sessionHash=null;
            if (($body['link']??false)===true) {
                $s=$this->session($r,true);
                if (!$db->fetchOne('SELECT id FROM players WHERE id=? FOR UPDATE',[$s['player_id']])) throw new ApiError(401,'Please sign in again.');
                $this->recheck($s); $guest=$s['player_id']; $sessionHash=$s['token_hash'];
            }
            $db->insert('login_intents',['token_hash'=>$this->hash($token),'email'=>$email,'guest_id'=>$guest,'session_hash'=>$sessionHash,'expires_at'=>time()+900]);
        });
        // Fragment avoids exposing credentials to access logs and referrers.
        $link=$this->origin().'/#login='.$token;
        try {
            $mailer=new Mailer(Transport::fromDsn($_ENV['MAILER_DSN'] ?? getenv('MAILER_DSN')));
            $mailer->send((new Email())->from($_ENV['MAIL_FROM'] ?? getenv('MAIL_FROM'))->to($email)->subject('Your Prospect Hollow sign-in link')->text("Confirm your sign-in in the next 15 minutes:\n\n".$link."\n\nIf you did not request this, ignore this email."));
        } catch (\Throwable) {
            $db->delete('login_intents',['token_hash'=>$this->hash($token)]);
            error_log('mail_delivery_failed');
            // Keep the response neutral, including SMTP rejection of unknown recipients.
        }
        return ['message'=>'If delivery is possible, a sign-in link is on its way.'];
    }
    public function confirm(Request $r,array $body): JsonResponse {
        ProfileService::keys($body,['token','useExisting']);
        if (!is_string($body['token']??null) || !preg_match('/^[a-f0-9]{64}$/D',$body['token']) || (array_key_exists('useExisting',$body) && !is_bool($body['useExisting']))) throw new ApiError(422,'Invalid sign-in link.');
        $db=$this->database->get(); $hash=$this->hash($body['token']);
        // Serialize email ownership without exposing email addresses in a lock table.
        $intent=$db->fetchAssociative('SELECT * FROM login_intents WHERE token_hash=?',[$hash]);
        if (!$intent || (int)$intent['expires_at']<=time()) throw new ApiError(401,'This link has expired or was already used.');
        return $db->transactional(function() use($db,$r,$body,$hash,$intent) {
            $emailHash=$this->hash('identity:'.$intent['email']);
            $mysql=$db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
            $db->executeStatement($mysql ? 'INSERT INTO identities(email_hash) VALUES (?) ON DUPLICATE KEY UPDATE email_hash=VALUES(email_hash)' : 'INSERT INTO identities(email_hash) VALUES (?) ON CONFLICT(email_hash) DO NOTHING',[$emailHash]);
            $db->fetchOne('SELECT email_hash FROM identities WHERE email_hash=? FOR UPDATE',[$emailHash]);
            $existing=$db->fetchAssociative('SELECT id FROM players WHERE email=?',[$intent['email']]);
            $s=null; $ids=[];
            if ($intent['guest_id']) {
                $s=$this->session($r,true);
                if ($s['player_id']!==$intent['guest_id'] || !hash_equals($intent['session_hash'],$s['token_hash'])) throw new ApiError(403,'Open this linking email in the browser where you requested it.');
                $ids[]=$s['player_id'];
            }
            if ($existing) $ids[]=$existing['id'];
            sort($ids,SORT_STRING); $players=[];
            foreach(array_unique($ids) as $id) {
                $row=$db->fetchAssociative('SELECT * FROM players WHERE id=? FOR UPDATE',[$id]);
                if (!$row) throw new ApiError(401,'Please request a new sign-in link.');
                $players[$id]=$row;
            }
            if ($s) $this->recheck($s);
            // Recheck after the player lock: revoke-all/deletion may invalidate a link.
            $live=$db->fetchAssociative('SELECT * FROM login_intents WHERE token_hash=? FOR UPDATE',[$hash]);
            if (!$live || (int)$live['expires_at']<=time()) throw new ApiError(401,'This link has expired or was already used.');
            if ($s) {
                $guest=$players[$s['player_id']];
                if ($existing && $existing['id']!==$guest['id']) {
                    if (($body['useExisting']??false)!==true) throw new ApiError(409,'This email already has a village. Choose “Use existing village” to sign in; this guest village is kept separately.');
                    $id=$existing['id'];
                } else {
                    if ($guest['email'] && $guest['email']!==$intent['email']) throw new ApiError(409,'This village is already linked to another email.');
                    $db->update('players',['email'=>$intent['email']],['id'=>$guest['id']]); $id=$guest['id'];
                }
            } elseif ($existing) $id=$existing['id'];
            else { $id=bin2hex(random_bytes(16)); $this->createPlayer($id,$intent['email']); }
            $db->delete('login_intents',['token_hash'=>$hash]);
            // Rotate the browser's previous session while preserving other devices.
            if ($s) $db->delete('sessions',['token_hash'=>$s['token_hash']]);
            return $this->issue($id);
        });
    }
    public function clearCookie(): JsonResponse {
        $response=new JsonResponse(['ok'=>true]);
        $response->headers->clearCookie($this->cookieName(),'/',null,str_starts_with($this->origin(),'https:'),true,'strict');
        return $response;
    }
    public function logout(Request $r,bool $all=false): JsonResponse {
        $s=$this->session($r,true); $db=$this->database->get();
        $db->transactional(function() use($db,$s,$all) {
            $row=$db->fetchAssociative('SELECT * FROM players WHERE id=? FOR UPDATE',[$s['player_id']]);
            if (!$row) throw new ApiError(401,'Please sign in again.');
            $this->recheck($s);
            $db->delete('sessions',$all ? ['player_id'=>$s['player_id']] : ['token_hash'=>$s['token_hash']]);
            $db->delete('login_intents',$all ? ['guest_id'=>$s['player_id']] : ['session_hash'=>$s['token_hash']]);
            if ($all && $row['email']) $db->delete('login_intents',['email'=>$row['email']]);
        });
        return $this->clearCookie();
    }
    public function limit(string $key,int $max,int $seconds): void {
        $db=$this->database->get(); $bucket=$this->hash($key.':'.intdiv(time(),$seconds));
        $sql=$db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\AbstractMySQLPlatform
            ? 'INSERT INTO limits(bucket,hits,until_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=hits+1'
            : 'INSERT INTO limits(bucket,hits,until_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=limits.hits+1';
        $db->executeStatement($sql,[$bucket,time()+$seconds]);
        if ((int)$db->fetchOne('SELECT hits FROM limits WHERE bucket=?',[$bucket])>$max) throw new ApiError(429,'Too many requests. Please wait and try again.');
    }
}
