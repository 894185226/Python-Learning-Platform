// ===================================================
// WebSocket 实时通知服务模块
// ===================================================
const WebSocket = require('ws');
const shared = require('../shared');

const wsClients = new Map(); // username -> Set<WebSocket>

// 向指定用户发送消息
function wsBroadcast(username, message) {
    const clients = wsClients.get(username);
    if (!clients) return;
    const data = JSON.stringify(message);
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    }
}

// 向所有在线用户广播
function wsBroadcastAll(message) {
    const data = JSON.stringify(message);
    for (const [, clients] of wsClients) {
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
}

// 创建通知（写入数据库 + WebSocket 实时推送）
async function createNotification(studentId, title, content, type) {
    try {
        const [result] = await shared.pool.execute(
            'INSERT INTO notifications (student_id, title, content, type) VALUES (?, ?, ?, ?)',
            [studentId, title, content, type]
        );
        const [students] = await shared.pool.query('SELECT username FROM students WHERE id = ?', [studentId]);
        if (students.length > 0) {
            wsBroadcast(students[0].username, {
                type: 'notification',
                data: { id: result.insertId, title, content, type, is_read: 0 }
            });
        }
        return result.insertId;
    } catch (e) {
        console.error('创建通知失败:', e.message);
        return null;
    }
}

// 初始化 WebSocket 服务器
function initWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        let username = null;

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'auth') {
                    const token = msg.token;
                    const sessionUser = shared.sessions.get(token);
                    if (!sessionUser) {
                        ws.send(JSON.stringify({ type: 'auth_error', message: '认证失败' }));
                        return;
                    }
                    username = sessionUser.username;
                    if (!wsClients.has(username)) {
                        wsClients.set(username, new Set());
                    }
                    wsClients.get(username).add(ws);
                    ws.send(JSON.stringify({ type: 'auth_ok' }));
                    console.log(`[WS] 用户 ${username} 已连接`);
                }
            } catch (e) { console.warn('[ws] 消息发送失败:', e.message); }
        });

        ws.on('close', () => {
            if (username && wsClients.has(username)) {
                wsClients.get(username).delete(ws);
                if (wsClients.get(username).size === 0) {
                    wsClients.delete(username);
                }
                console.log(`[WS] 用户 ${username} 已断开`);
            }
        });

        ws.on('error', () => {
            if (username && wsClients.has(username)) {
                wsClients.get(username).delete(ws);
                if (wsClients.get(username).size === 0) {
                    wsClients.delete(username);
                }
            }
        });

        // 30秒内未认证则断开
        setTimeout(() => {
            if (!username && ws.readyState === WebSocket.OPEN) {
                ws.close(4001, '认证超时');
            }
        }, 30000);
    });

    return wss;
}

module.exports = {
    wsClients,
    wsBroadcast,
    wsBroadcastAll,
    createNotification,
    initWebSocket,
};