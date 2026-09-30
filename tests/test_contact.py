"""Run an isolated PHP process. Valid submissions NEVER send email (test mode records an outbox)."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlencode
import hashlib,json,os,subprocess,tempfile,time,unittest
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:8770'

class ContactChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='portfolio-contact-tests-')
        config=Path(cls.temp.name)/'mail.php'
        cls.rates=Path(cls.temp.name)/'rates'
        config.write_text("<?php return ['rate_directory'=>'"+cls.rates.as_posix()+"','rate_salt'=>'test-only-salt','min_seconds'=>0,'pow_max'=>300,"
                          "'dns_check'=>false,'challenge_threshold'=>5,'global_limits'=>[3600=>8,86400=>60]];")
        env=os.environ.copy();env.update(PORTFOLIO_TEST_MODE='1',CODEWITHUSMAN_MAIL_CONFIG=str(config))
        cls.server=subprocess.Popen(['php','-S','127.0.0.1:8770','-t',str(ROOT),str(ROOT/'tools/router.php')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(40):
            try:urlopen(BASE+'/',timeout=.3);break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('PHP test server did not start')
    @classmethod
    def tearDownClass(cls):
        cls.server.terminate();cls.server.wait(timeout=5);cls.temp.cleanup()
    def setUp(self):
        for f in self.rates.glob('*.json'):f.unlink()
    def clear_ip_limits(self):
        # Simulates a request from a new client IP (per-IP files are hashes; keep shared state).
        for f in self.rates.glob('*.json'):
            if len(f.stem)==64:f.unlink()
    def fill_global(self,count):
        self.rates.mkdir(exist_ok=True);(self.rates/'global.json').write_text(json.dumps([int(time.time())]*count))
    def outbox(self):
        f=self.rates/'test-outbox.json';return json.loads(f.read_text()) if f.exists() else []
    def token(self):
        return json.load(urlopen(BASE+'/contact.php?token=1',timeout=5))['token']
    def solve(self,token):
        _,salt,challenge,_=token.split('.')
        return next(str(n) for n in range(301) if hashlib.sha256((salt+str(n)).encode()).hexdigest()==challenge)
    def post(self,data,origin=BASE,token=True):
        if token and 'token' not in data:
            t=self.token();data=dict(data,token=t,pow=self.solve(t))
        request=Request(BASE+'/contact.php',urlencode(data).encode(),headers={'Origin':origin} if origin else {})
        try:response=urlopen(request,timeout=5)
        except HTTPError as error:response=error
        return response.status,json.load(response)
    valid={'name':'Test Person','email':'test@example.com','subject':'Test','message':'Test only; no email is sent.'}

    def test_validation_bot_checks_and_ip_limit(self):
        valid=self.valid
        self.assertEqual(self.post(valid,'https://unrelated.example')[0],403)
        self.assertEqual(self.post(valid,origin=None)[0],403)
        self.assertEqual(self.post(valid,token=False),(403,{'ok':False,'error':'token_invalid'}))
        self.assertEqual(self.post(dict(valid,token='123.forged'))[0],403)
        t=self.token()
        self.assertEqual(self.post(dict(valid,token=t,pow='999999')),(403,{'ok':False,'error':'pow_failed'}))
        solved=dict(valid,token=t,pow=self.solve(t))
        self.assertEqual(self.post(solved)[0],200)
        self.assertEqual(self.post(solved),(403,{'ok':False,'error':'token_invalid'}))  # replayed puzzle
        self.assertEqual(self.post(dict(valid,message='see http://a.example http://b.example http://c.example'))[0],422)
        self.assertEqual(self.post({})[0],422)
        self.assertEqual(self.post(dict(valid,name='Injected\r\nHeader'))[0],422)
        self.assertEqual(self.post(dict(valid,email='invalid'))[0],422)
        self.assertEqual(self.post(dict(valid,**{'name[]':'bad'}))[0],422)
        self.assertEqual(self.post(dict(valid,message='x'*5001))[0],422)
        self.assertEqual(self.post(dict(valid,_gotcha='bot')),(200,{'ok':True,'error':''}))
        self.setUp()
        # Character limits count Unicode characters rather than UTF-8 bytes.
        self.assertEqual(self.post(dict(valid,name='ع'*100,message='رسالة اختبار'))[0],200)
        for _ in range(4):self.assertEqual(self.post(valid)[0],200)
        self.assertEqual(self.post(valid)[0],429)
        # Owner mail only; the typed-in address never receives the message.
        self.assertTrue(all(m['to']=='usmanasif26261@gmail.com' for m in self.outbox()))

    def test_disposable_email_rejected(self):
        self.assertEqual(self.post(dict(self.valid,email='someone@mailinator.com')),(422,{'ok':False,'error':'email_domain'}))
        self.assertEqual(self.post(dict(self.valid,email='x@sub.yopmail.com'))[0],422)

    def test_email_code_required_under_attack(self):
        self.fill_global(5)  # at the challenge threshold
        status,body=self.post(self.valid)
        self.assertEqual((status,body['error']),(200,'verify_email'))
        code=body['test_code'];sent=self.outbox()[-1]
        self.assertEqual(sent['to'],'test@example.com')
        self.assertIn(code,sent['body']);self.assertNotIn(self.valid['message'],sent['body'])  # fixed text only
        self.assertEqual(self.post(dict(self.valid,otp='000000'))[1]['error'],'otp_invalid')
        self.assertEqual(self.post(dict(self.valid,otp=code)),(200,{'ok':True,'error':''}))
        self.assertIn('Email verified: yes',self.outbox()[-1]['body'])
        self.assertEqual(self.post(dict(self.valid,otp=code))[1]['error'],'otp_invalid')  # single use

    def test_site_wide_limit_for_verified_senders(self):
        self.fill_global(8)  # hourly cap reached: even a verified sender is refused
        status,body=self.post(self.valid);self.assertEqual(body['error'],'verify_email')
        self.clear_ip_limits()
        self.assertEqual(self.post(dict(self.valid,otp=body['test_code'])),(429,{'ok':False,'error':'Please try again later'}))
        alerts=[m for m in self.outbox() if 'blocking suspicious traffic' in m['subject']]
        self.assertEqual(len(alerts),1);self.assertIn('rate_global',alerts[0]['body'])

    def test_private_paths_are_not_served(self):
        for path in ['/content/home.html','/vendor/autoload.php','/.git/config','/plan.md','/mail-config.example.php']:
            with self.assertRaises(HTTPError) as error:urlopen(BASE+path)
            self.assertEqual(error.exception.code,404)
if __name__=='__main__':unittest.main()
