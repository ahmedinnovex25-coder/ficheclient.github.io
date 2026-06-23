<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Le chemin vers le fichier de base de données
$db_file = __DIR__ . '/data/db.json';

// Créer le dossier et le fichier s'ils n'existent pas
if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0777, true);
}
if (!file_exists($db_file)) {
    $defaultDB = [
        'visitors' => [],
        'team' => [],
        'settings' => ['adminPassword' => 'Admin123'],
        'nextVisitorId' => 1,
        'nextTeamId' => 1
    ];
    file_put_contents($db_file, json_encode($defaultDB, JSON_PRETTY_PRINT));
}

function readDB() {
    global $db_file;
    return json_decode(file_get_contents($db_file), true);
}

function writeDB($data) {
    global $db_file;
    file_put_contents($db_file, json_encode($data, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$parts = explode('/', trim($endpoint, '/'));
$resource = $parts[0] ?? '';
$id = $parts[1] ?? null;

$db = readDB();

if ($resource === 'visitors') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['visitors']));
        exit;
    }
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $visitor = $input;
        $visitor['id'] = $db['nextVisitorId']++;
        $visitor['date'] = date('c'); 
        $db['visitors'][] = $visitor;
        writeDB($db);
        http_response_code(201);
        echo json_encode($visitor);
        exit;
    }
    if ($method === 'DELETE' && $id !== null) {
        $id = (int)$id;
        $db['visitors'] = array_filter($db['visitors'], function($v) use ($id) {
            return $v['id'] !== $id;
        });
        $db['visitors'] = array_values($db['visitors']);
        writeDB($db);
        echo json_encode(['ok' => true]);
        exit;
    }
}

if ($resource === 'team') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['team']));
        exit;
    }
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $member = $input;
        $member['id'] = $db['nextTeamId']++;
        $db['team'][] = $member;
        writeDB($db);
        http_response_code(201);
        echo json_encode($member);
        exit;
    }
    if ($method === 'DELETE' && $id !== null) {
        $id = (int)$id;
        $db['team'] = array_filter($db['team'], function($m) use ($id) {
            return $m['id'] !== $id;
        });
        $db['team'] = array_values($db['team']);
        writeDB($db);
        echo json_encode(['ok' => true]);
        exit;
    }
}

if ($resource === 'settings' && $id !== null) { 
    $key = $id;
    if ($method === 'GET') {
        $value = isset($db['settings'][$key]) ? $db['settings'][$key] : null;
        echo json_encode(['value' => $value]);
        exit;
    }
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $db['settings'][$key] = $input['value'];
        writeDB($db);
        echo json_encode(['ok' => true]);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found']);
