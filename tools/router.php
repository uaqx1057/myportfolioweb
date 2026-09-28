<?php
// Local preview only. Mirrors private-path blocking from .htaccess.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (preg_match('#(?:^|/)(?:\.[^/]+|content|tools|tests|tmp|build|vendor|node_modules)(?:/|$)#i', $path)
    || preg_match('/\.(?:md|json|lock|py)$/i', $path)
    || str_contains($path, 'mail-config')) {
    http_response_code(404); echo 'Not found'; return true;
}
return false;
