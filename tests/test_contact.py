"""Run an isolated PHP process. Valid submissions NEVER send email."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlencode
import json,os,subprocess,tempfile,time,unittest
ROOT=Path(__file__).resolve().parents[1]

class ContactChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='portfolio-contact-tests-')
        config=Path(cls.temp.name)/'mail.php'
        directory=(Path(cls.temp.name)/'rates').as_posix();cls.rates=Path(directory)
        config.write_text("<?php return ['rate_directory'=>'"+directory+"','rate_salt'=>'test-only-salt','min_seconds'=>0,'global_limits'=>[3600=>8,86400=>60]];")
        env=os.environ.copy();env.update(PORTFOLIO_TEST_MODE='1',CODEWITHUSMAN_MAIL_CONFIG=str(config))
        cls.server=subprocess.Popen(['php','-S','127.0.0.1:8770','-t',str(ROOT),str(ROOT/'tools/router.php')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(40):
            try:urlopen('http://127.0.0.1:8770/',timeout=.3);break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('PHP test server did not start')
    @classmethod
    def tearDownClass(cls):
        cls.server.terminate();cls.server.wait(timeout=5);cls.temp.cleanup()
    def clear_rates(self,keep_global=False):
        for f in self.rates.glob('*.json'):
            if not(keep_global and f.name=='global.json'):f.unlink()
    def token(self):
        return json.load(urlopen('http://127.0.0.1:8770/contact.php?token=1',timeout=5))['token']
    def post(self,data,origin='http://127.0.0.1:8770',token=True):
        if token and 'token' not in data:data=dict(data,token=self.token())
        headers={'Origin':origin} if origin else {}
        request=Request('http://127.0.0.1:8770/contact.php',urlencode(data).encode(),headers=headers)
        try:response=urlopen(request,timeout=5)
        except HTTPError as error:response=error
        return response.status,json.load(response)
    def test_validation_and_atomic_limit(self):
        self.clear_rates()
        valid={'name':'Test Person','email':'test@example.com','subject':'Test','message':'Test only; no email is sent.'}
        self.assertEqual(self.post(valid,'https://unrelated.example')[0],403)
        self.assertEqual(self.post(valid,origin=None)[0],403)
        self.assertEqual(self.post(valid,token=False),(403,{'ok':False,'error':'token_invalid'}))
        self.assertEqual(self.post(dict(valid,token='123.forged'))[0],403)
        self.assertEqual(self.post(dict(valid,message='see http://a.example http://b.example http://c.example'))[0],422)
        self.assertEqual(self.post({})[0],422)
        self.assertEqual(self.post(dict(valid,name='Injected\r\nHeader'))[0],422)
        self.assertEqual(self.post(dict(valid,email='invalid'))[0],422)
        self.assertEqual(self.post(dict(valid,**{'name[]':'bad'}))[0],422)
        self.assertEqual(self.post(dict(valid,message='x'*5001))[0],422)
        self.assertEqual(self.post(dict(valid,_gotcha='bot')),(200,{'ok':True,'error':''}))
        # Character limits count Unicode characters rather than UTF-8 bytes.
        arabic=dict(valid,name='ع'*100,message='رسالة اختبار')
        self.assertEqual(self.post(arabic)[0],200)
        for _ in range(4):self.assertEqual(self.post(valid)[0],200)
        self.assertEqual(self.post(valid)[0],429)
    def test_site_wide_limit(self):
        # Different client IPs cannot be simulated locally, so exhaust the global cap
        # (8/hour in the test config) using the remaining global budget.
        self.clear_rates();valid={'name':'Another Person','email':'b@example.com','subject':'Hi','message':'Global limit check.'}
        codes=[]
        for _ in range(9):
            self.clear_rates(keep_global=True)  # simulate a new IP each time
            codes.append(self.post(valid)[0])
        self.assertEqual(codes,[200]*8+[429])
    def test_private_paths_are_not_served(self):
        for path in ['/content/home.html','/vendor/autoload.php','/.git/config','/plan.md','/mail-config.example.php']:
            with self.assertRaises(HTTPError) as error:urlopen('http://127.0.0.1:8770'+path)
            self.assertEqual(error.exception.code,404)
if __name__=='__main__':unittest.main()
