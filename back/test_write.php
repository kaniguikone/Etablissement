<?php
$dir = __DIR__ . '/bootstrap/cache';
echo "Dossier existe : " . (is_dir($dir) ? 'OUI' : 'NON') . "\n";
echo "Inscriptible : " . (is_writable($dir) ? 'OUI' : 'NON') . "\n";
echo "PHP tourne en tant que : " . get_current_user() . "\n";

$test = $dir . '/test_php.txt';
$result = file_put_contents($test, 'test');
echo "Écriture test : " . ($result !== false ? 'OK' : 'ÉCHEC') . "\n";
if ($result !== false) unlink($test);
