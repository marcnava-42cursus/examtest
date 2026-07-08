export const LEVELS = [
    { name: 'Primer token', xp: 0 },
    { name: 'Ya no huyes del código', xp: 50 },
    { name: 'Variables bajo control', xp: 150 },
    { name: 'Funciones cortas memorizadas', xp: 350 },
    { name: 'Select empieza a sonar', xp: 600 },
    { name: 'Cliente conectado', xp: 1000 },
    { name: 'Buffers domesticados', xp: 1500 },
    { name: 'Main en marcha', xp: 2200 },
    { name: 'Archivo casi entero', xp: 3200 },
    { name: 'Código sin mirar', xp: 4500 }
];

export const BLOCK_DEFS = [
    { name: 'Variables globales', icon: '📦', start: 'int count', end: 'char buff_read' },
    { name: 'fatal_error()', icon: '💀', start: 'void fatal_error', end: null, fn: 'fatal_error' },
    { name: 'extract_message()', icon: '✉️', start: 'int extract_message', end: null, fn: 'extract_message' },
    { name: 'str_join()', icon: '🔗', start: 'char *str_join', end: null, fn: 'str_join' },
    { name: 'create_socket()', icon: '🔌', start: 'int create_socket', end: null, fn: 'create_socket' },
    { name: 'notify()', icon: '📢', start: 'void notify', end: null, fn: 'notify' },
    { name: 'server()', icon: '🖥️', start: 'int server', end: null, fn: 'server' },
    { name: 'client()', icon: '👤', start: 'int client(int fd)', end: null, fn: 'client' },
    { name: 'main - argumentos', icon: '🚀', start: 'int main', end: 'FD_ZERO' },
    { name: 'main - socket', icon: '🔧', start: 'int sockfd = create_socket', end: 'servaddr.sin_port' },
    { name: 'main - bind/listen', icon: '🎧', start: 'if ((bind', end: 'if (listen' },
    { name: 'main - while/select', icon: '🔄', start: 'while(1)', end: 'return 0;' }
];

const CATEGORIES = [
    { id: 'practice', name: 'Práctica', icon: '🧠' },
    { id: 'easy', name: 'Examen fácil', icon: '📝' },
    { id: 'real', name: 'Examen real', icon: '🎯' },
];

const COMMON_TYPES = [
    ['pct_25', '25%', '🌱'],
    ['half_file', '50%', '📊'],
    ['pct_75', '75%', '🌳'],
    ['full_file', 'Archivo completo', '🏆'],
    ['no_hints', 'Sin ayuda', '🧠'],
    ['review_5', 'Repasador', '🔄'],
];

export const ACHIEVEMENT_CATEGORIES = [
    { id: 'general', name: 'General', icon: '⭐' },
    ...CATEGORIES,
];

export const ACHIEVEMENTS_DEF = [
    { id: 'general_wrote_comment', name: 'Comentarista', icon: '💬', desc: 'Escribe un comentario en el código', category: 'general' },
    { id: 'general_streak_3', name: '3 días seguidos', icon: '🔥', desc: 'Racha de 3 días', category: 'general' },
    { id: 'general_streak_7', name: '7 días seguidos', icon: '🔥', desc: 'Racha de 7 días', category: 'general' },
    { id: 'general_first_line', name: 'Primera línea', icon: '✏️', desc: 'Completa tu primera línea', category: 'general' },
    { id: 'general_first_block', name: 'Primer bloque', icon: '📦', desc: 'Completa tu primer bloque', category: 'general' },
    { id: 'general_ten_streak', name: '10 seguidas', icon: '⚡', desc: '10 líneas consecutivas correctas', category: 'general' },
    ...CATEGORIES.flatMap(cat =>
        COMMON_TYPES.map(([id, name, icon]) => ({
            id: `${cat.id}_${id}`,
            name,
            icon,
            desc: `${cat.name}: ${name.toLowerCase()}`,
            category: cat.id,
        }))
    ),
];

export const MICROCOPY_OK = [
    "Bien. Siguiente línea.", "Esa ya empieza a salir.",
    "Correcto. Sigue.", "Línea guardada.", "Una menos.", "Memoria muscular."
];

export const MICROCOPY_FAIL = [
    "Casi. Repítela.", "Esta línea todavía muerde.",
    "No pasa nada. Otra vuelta.", "Aquí se repite, no se teoriza.", "Mira y vuelve."
];

export const KEYWORDS = new Set([
    'int', 'char', 'void', 'return', 'if', 'else', 'while', 'for',
    'break', 'continue', 'struct', 'const', 'sizeof', 'exit',
    'unsigned', 'long', 'short', 'double', 'float', 'switch',
    'case', 'default', 'do', 'typedef', 'enum', 'static', 'extern'
]);

export const TYPES = new Set([
    'socklen_t', 'fd_set', 'AF_INET', 'SOCK_STREAM', 'SOMAXCONN',
    'NULL', 'INADDR_ANY', 'SOL_SOCKET', 'SO_REUSEADDR'
]);

export const FUNCTIONS = new Set([
    'fprintf', 'printf', 'socket', 'FD_SET', 'FD_CLR', 'FD_ISSET',
    'FD_ZERO', 'send', 'strlen', 'accept', 'sprintf', 'notify',
    'recv', 'free', 'close', 'calloc', 'strcpy', 'malloc', 'strcat',
    'bind', 'listen', 'select', 'htonl', 'htons', 'atoi', 'bzero',
    'fatal_error', 'create_socket', 'server', 'client',
    'extract_message', 'str_join', 'write', 'read', 'open',
    'memset', 'memcpy', 'snprintf'
]);
