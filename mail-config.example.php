<?php
// Copy OUTSIDE public_html to ~/.config/codewithusman/mail.php.
// Never commit the configured file or include it in a public ZIP.
return [
    'host' => 'codewithusman.com',
    'port' => 465,
    'username' => 'info@codewithusman.com',
    'password' => '',
    'recipient' => 'usmanasif26261@gmail.com',
    'rate_salt' => '', // Generate with: php -r "echo bin2hex(random_bytes(32));"
];
