const {
    Client,
    GatewayIntentBits,
    Partials,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder
} = require('discord.js');

const {
    createCanvas,
    loadImage
} = require('@napi-rs/canvas');

require('./keep_alive');

// ==========================================
// CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const TOKEN = process.env.TOKEN;

const LOG_CHANNEL_ID = '1556626740569444422';

const ALLOWED_INVITE_CATEGORIES = [
    '1554482905147904070',
    '1552649476370604214'
];

// Mensagens apagadas automaticamente pelo Security Bot
const securityDeletedMessages = new Set();

// ==========================================
// BOT ONLINE
// ==========================================

client.once('ready', () => {
    console.log(`✅ VTL Security Bot online como ${client.user.tag}`);
});

// ==========================================
// DETECTAR LINK DE CONVITE
// ==========================================

function containsDiscordInvite(content) {
    if (!content) return false;

    const inviteRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/i;

    return inviteRegex.test(content);
}

// ==========================================
// CRIAR PREVIEW DA MENSAGEM
// ==========================================

async function createMessagePreview(message) {

    const width = 1000;
    const height = 190;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // ======================================
    // FUNDO
    // ======================================

    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, width, height);

    // ======================================
    // AVATAR
    // ======================================

    const avatarX = 35;
    const avatarY = 35;
    const avatarSize = 100;

    try {

        if (message.author) {

            const avatarURL =
                message.author.displayAvatarURL({
                    extension: 'png',
                    size: 256
                });

            const avatar =
                await loadImage(avatarURL);

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2
            );

            ctx.clip();

            ctx.drawImage(
                avatar,
                avatarX,
                avatarY,
                avatarSize,
                avatarSize
            );

            ctx.restore();
        }

    } catch (error) {

        ctx.fillStyle = '#5865f2';

        ctx.beginPath();

        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // ======================================
    // NOME
    // ======================================

    const username =
        message.author?.displayName ||
        message.author?.username ||
        'Usuário';

    ctx.font = 'bold 31px Arial';
    ctx.fillStyle = '#f2f3f5';

    ctx.fillText(
        username,
        165,
        70
    );

    // ======================================
    // DATA
    // ======================================

    ctx.font = '20px Arial';
    ctx.fillStyle = '#949ba4';

    const dateText = message.createdAt
        ? `Hoje às ${message.createdAt.toLocaleTimeString(
            'pt-BR',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        )}`
        : 'Mensagem';

    ctx.fillText(
        dateText,
        165,
        101
    );

    // ======================================
    // CONTEÚDO
    // ======================================

    let content =
        message.content || '';

    if (!content && message.attachments?.size) {
        content = '📎 Anexo';
    }

    if (!content) {
        content = 'Mensagem sem conteúdo';
    }

    content =
        content.replace(/\n/g, ' ');

    if (content.length > 85) {
        content =
            content.slice(0, 85) + '...';
    }

    ctx.font = '32px Arial';
    ctx.fillStyle = '#dbdee1';

    ctx.fillText(
        content,
        165,
        145
    );

    return canvas.encode('png');
}

// ==========================================
// BLOQUEIO DE CONVITES
// ==========================================

client.on('messageCreate', async (message) => {

    try {

        if (!message.guild) return;

        if (message.author.bot) return;

        if (!containsDiscordInvite(message.content)) {
            return;
        }

        const categoryId =
            message.channel.parentId;

        // ==================================
        // CATEGORIAS PERMITIDAS
        // ==================================

        if (
            ALLOWED_INVITE_CATEGORIES.includes(
                categoryId
            )
        ) {
            return;
        }

        // ==================================
        // MARCAR MENSAGEM
        // ==================================

        securityDeletedMessages.add(
            message.id
        );

        setTimeout(() => {
            securityDeletedMessages.delete(
                message.id
            );
        }, 10000);

        // ==================================
        // APAGAR
        // ==================================

        try {

            await message.delete();

        } catch (error) {

            console.log(
                '❌ Não foi possível apagar a mensagem:',
                error.message
            );

            securityDeletedMessages.delete(
                message.id
            );

            return;
        }

        // ==================================
        // AVISO
        // ==================================

        const container =
            new ContainerBuilder()

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `🔔 | ${message.author} não é possivel mandar links de convites nesse canal!`
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '-# VTL Security Bot'
                        )
                );

        try {

            const warning =
                await message.channel.send({
                    components: [container],
                    flags:
                        MessageFlags.IsComponentsV2
                });

            // Apagar aviso em 3 segundos

            setTimeout(async () => {

                try {

                    await warning.delete();

                } catch (error) {
                    // Ignorar
                }

            }, 3000);

        } catch (error) {

            console.log(
                '❌ Erro ao enviar aviso:',
                error.message
            );
        }

    } catch (error) {

        console.error(
            '❌ Erro no bloqueio de convites:',
            error
        );
    }
});

// ==========================================
// MENSAGEM DELETADA
// ==========================================

client.on('messageDelete', async (message) => {

    try {

        if (!message.guild) return;

        // ==================================
        // NÃO LOGAR EXCLUSÕES DO BOT
        // ==================================

        if (
            securityDeletedMessages.has(
                message.id
            )
        ) {

            securityDeletedMessages.delete(
                message.id
            );

            return;
        }

        // Não registrar bots

        if (message.author?.bot) {
            return;
        }

        const logChannel =
            message.guild.channels.cache.get(
                LOG_CHANNEL_ID
            );

        if (!logChannel) {

            console.log(
                '❌ Canal de logs não encontrado.'
            );

            return;
        }

        // ==================================
        // AUTOR
        // ==================================

        const author =
            message.author;

        const authorMention =
            author
                ? `<@${author.id}>`
                : 'Usuário desconhecido';

        const authorId =
            author
                ? author.id
                : 'desconhecido';

        // ==================================
        // CONTEÚDO
        // ==================================

        let content =
            message.content ||
            '*Mensagem sem conteúdo de texto*';

        if (content.length > 3000) {

            content =
                content.slice(0, 3000) +
                '...';
        }

        content =
            content.replace(
                /```/g,
                '\\`\\`\\`'
            );

        // ==================================
        // IMAGENS / GIFS
        // ==================================

        const imageAttachments = [];

        if (message.attachments?.size) {

            message.attachments.forEach(
                (attachment) => {

                    const isImage =
                        attachment.contentType?.startsWith(
                            'image/'
                        ) ||
                        /\.(png|jpg|jpeg|gif|webp)$/i.test(
                            attachment.name || ''
                        );

                    if (isImage) {

                        imageAttachments.push(
                            attachment.url
                        );
                    }
                }
            );
        }

        // ==================================
        // PREVIEW
        // ==================================

        let previewBuffer = null;

        try {

            previewBuffer =
                await createMessagePreview(
                    message
                );

        } catch (error) {

            console.log(
                '⚠️ Erro ao criar preview:',
                error.message
            );
        }

        // ==================================
        // CONTAINER
        // ==================================

        const container =
            new ContainerBuilder();

        // ==================================
        // PREVIEW
        // ==================================

        if (previewBuffer) {

            const previewAttachment =
                new AttachmentBuilder(
                    previewBuffer,
                    {
                        name:
                            'mensagem-deletada.png'
                    }
                );

            const mediaGallery =
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(
                                'attachment://mensagem-deletada.png'
                            )
                    );

            container.addMediaGalleryComponents(
                mediaGallery
            );
        }

        // ==================================
        // SEPARADOR
        // ==================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================
        // TEXTO DO LOG
        // ==================================

        let logText =
            `## 🗑 Mensagem Deletada\n` +
            `-# Canal\n` +
            `<#${message.channelId}>\n` +
            `-# User\n` +
            `${authorMention} (\`${authorId}\`)\n` +
            `-# Mensagem\n` +
            `\`\`\`\n${content}\n\`\`\``;

        // ==================================
        // IMAGEM
        // ==================================

        if (
            imageAttachments.length > 0
        ) {

            logText +=
                `\n-# Imagem`;

            for (
                const url
                of imageAttachments
            ) {

                logText +=
                    `\n${url}`;
            }
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(logText)
        );

        // ==================================
        // SEPARADOR FINAL
        // ==================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================
        // FOOTER
        // ==================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '-# VTL Security Bot'
                )
        );

        // ==================================
        // ENVIAR
        // ==================================

        if (previewBuffer) {

            const previewAttachment =
                new AttachmentBuilder(
                    previewBuffer,
                    {
                        name:
                            'mensagem-deletada.png'
                    }
                );

            await logChannel.send({

                files: [
                    previewAttachment
                ],

                components: [
                    container
                ],

                flags:
                    MessageFlags.IsComponentsV2
            });

        } else {

            await logChannel.send({

                components: [
                    container
                ],

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

    } catch (error) {

        console.error(
            '❌ Erro no messageDelete:',
            error
        );
    }
});

// ==========================================
// MENSAGEM EDITADA
// ==========================================

client.on(
    'messageUpdate',
    async (
        oldMessage,
        newMessage
    ) => {

        try {

            if (!newMessage.guild) {
                return;
            }

            if (newMessage.author?.bot) {
                return;
            }

            // ==================================
            // VERIFICAR CONTEÚDO
            // ==================================

            if (
                oldMessage.content ===
                newMessage.content
            ) {

                return;
            }

            const logChannel =
                newMessage.guild.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!logChannel) {

                console.log(
                    '❌ Canal de logs não encontrado.'
                );

                return;
            }

            // ==================================
            // AUTOR
            // ==================================

            const author =
                newMessage.author;

            const authorMention =
                author
                    ? `<@${author.id}>`
                    : 'Usuário desconhecido';

            const authorId =
                author
                    ? author.id
                    : 'desconhecido';

            // ==================================
            // MENSAGEM ANTIGA
            // ==================================

            let oldContent =
                oldMessage.content ||
                '*Sem conteúdo*';

            if (oldContent.length > 1500) {

                oldContent =
                    oldContent.slice(
                        0,
                        1500
                    ) + '...';
            }

            oldContent =
                oldContent.replace(
                    /```/g,
                    '\\`\\`\\`'
                );

            // ==================================
            // MENSAGEM NOVA
            // ==================================

            let newContent =
                newMessage.content ||
                '*Sem conteúdo*';

            if (newContent.length > 1500) {

                newContent =
                    newContent.slice(
                        0,
                        1500
                    ) + '...';
            }

            newContent =
                newContent.replace(
                    /```/g,
                    '\\`\\`\\`'
                );

            // ==================================
            // CONTAINER
            // ==================================

            const container =
                new ContainerBuilder();

            // ==================================
            // TEXTO
            // ==================================

            container.addTextDisplayComponents(

                new TextDisplayBuilder()
                    .setContent(

                        `## 📝 Mensagem editada\n` +

                        `-# Canal\n` +
                        `<#${newMessage.channelId}>\n` +

                        `-# User\n` +
                        `${authorMention} (\`${authorId}\`)\n` +

                        `-# Mensagem Antiga\n` +
                        `\`\`\`\n${oldContent}\n\`\`\`\n` +

                        `-# Mensagem nova\n` +
                        `\`\`\`\n${newContent}\n\`\`\``
                    )
            );

            // ==================================
            // SEPARADOR
            // ==================================

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            // ==================================
            // FOOTER
            // ==================================

            container.addTextDisplayComponents(

                new TextDisplayBuilder()
                    .setContent(
                        '-# VTL Security Bot'
                    )
            );

            // ==================================
            // ENVIAR
            // ==================================

            await logChannel.send({

                components: [
                    container
                ],

                flags:
                    MessageFlags.IsComponentsV2
            });

        } catch (error) {

            console.error(
                '❌ Erro no messageUpdate:',
                error
            );
        }
    }
);

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);