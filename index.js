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

// Mensagens que foram apagadas pelo próprio Security Bot
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

    // Fundo estilo Discord
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
            const avatarURL = message.author.displayAvatarURL({
                extension: 'png',
                size: 256
            });

            const avatar = await loadImage(avatarURL);

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

    let content = message.content || '';

    if (!content && message.attachments?.size) {
        content = '📎 Anexo';
    }

    if (!content) {
        content = 'Mensagem sem conteúdo';
    }

    content = content.replace(/\n/g, ' ');

    if (content.length > 85) {
        content = content.slice(0, 85) + '...';
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

        if (!containsDiscordInvite(message.content)) return;

        const categoryId = message.channel.parentId;

        // Permitir convites nas categorias autorizadas
        if (ALLOWED_INVITE_CATEGORIES.includes(categoryId)) {
            return;
        }

        // ======================================
        // MARCAR COMO EXCLUÍDA PELO SECURITY BOT
        // ======================================

        securityDeletedMessages.add(message.id);

        // Limpeza de segurança da memória
        setTimeout(() => {
            securityDeletedMessages.delete(message.id);
        }, 10000);

        // ======================================
        // APAGAR MENSAGEM
        // ======================================

        try {
            await message.delete();
        } catch (error) {
            console.log(
                '❌ Não foi possível apagar a mensagem:',
                error.message
            );

            securityDeletedMessages.delete(message.id);
            return;
        }

        // ======================================
        // AVISO
        // ======================================

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🔔 | ${message.author} não é possivel mandar links de convites nesse canal!`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '-# VTL Security Bot'
                )
            );

        try {
            const warning = await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            // ==================================
            // APAGAR AVISO APÓS 3 SEGUNDOS
            // ==================================

            setTimeout(async () => {
                try {
                    await warning.delete();
                } catch (error) {
                    // Ignora caso a mensagem já tenha sido apagada
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

        // ======================================
        // NÃO LOGAR MENSAGENS APAGADAS PELO BOT
        // ======================================

        if (securityDeletedMessages.has(message.id)) {
            securityDeletedMessages.delete(message.id);
            return;
        }

        // Não registrar mensagens de bots
        if (message.author?.bot) return;

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

        // ======================================
        // AUTOR
        // ======================================

        const author = message.author;

        const authorMention = author
            ? `<@${author.id}>`
            : 'Usuário desconhecido';

        const authorId = author
            ? author.id
            : 'desconhecido';

        // ======================================
        // CANAL
        // ======================================

        const channelName =
            message.channel?.name ||
            'Canal desconhecido';

        // ======================================
        // CONTEÚDO
        // ======================================

        let content =
            message.content ||
            '*Mensagem sem conteúdo de texto*';

        if (content.length > 3000) {
            content =
                content.slice(0, 3000) + '...';
        }

        content = content.replace(
            /```/g,
            '\\`\\`\\`'
        );

        // ======================================
        // PREVIEW
        // ======================================

        let previewBuffer = null;

        try {
            previewBuffer =
                await createMessagePreview(message);
        } catch (error) {
            console.log(
                '⚠️ Erro ao criar preview:',
                error.message
            );
        }

        // ======================================
        // CONTAINER
        // ======================================

        const container =
            new ContainerBuilder();

        // ======================================
        // IMAGEM DA PREVIEW
        // ======================================

        if (previewBuffer) {
            const attachment =
                new AttachmentBuilder(
                    previewBuffer,
                    {
                        name: 'mensagem-deletada.png'
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

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 🗑 Mensagem Deletada\n` +
                    `-# Canal\n` +
                    `**${channelName}**\n` +
                    `-# User\n` +
                    `${authorMention} (\`${authorId}\`)\n` +
                    `-# Mensagem\n` +
                    `\`\`\`\n${content}\n\`\`\``
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '-# VTL Security Bot'
                )
            );

            await logChannel.send({
                files: [attachment],
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            return;
        }

        // ======================================
        // FALLBACK SEM PREVIEW
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## 🗑 Mensagem Deletada\n` +
                `-# Canal\n` +
                `**${channelName}**\n` +
                `-# User\n` +
                `${authorMention} (\`${authorId}\`)\n` +
                `-# Mensagem\n` +
                `\`\`\`\n${content}\n\`\`\``
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# VTL Security Bot'
            )
        );

        await logChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

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
    async (oldMessage, newMessage) => {
        try {
            if (!newMessage.guild) return;

            if (newMessage.author?.bot) return;

            // ==================================
            // TENTAR OBTER CONTEÚDO ANTIGO
            // ==================================

            if (
                oldMessage.partial &&
                newMessage.partial
            ) {
                try {
                    await newMessage.fetch();
                } catch (error) {
                    return;
                }
            }

            // ==================================
            // VERIFICAR ALTERAÇÃO
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

            const authorMention = author
                ? `<@${author.id}>`
                : 'Usuário desconhecido';

            const authorId = author
                ? author.id
                : 'desconhecido';

            // ==================================
            // CANAL
            // ==================================

            const channelName =
                newMessage.channel?.name ||
                'Canal desconhecido';

            // ==================================
            // MENSAGEM ANTIGA
            // ==================================

            let oldContent =
                oldMessage.content ||
                '*Sem conteúdo*';

            if (oldContent.length > 1500) {
                oldContent =
                    oldContent.slice(0, 1500) + '...';
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
                    newContent.slice(0, 1500) + '...';
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

            /*
             * Tudo fica no mesmo TextDisplay para
             * evitar espaços extras entre os campos.
             */

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 Mensagem editada\n` +
                    `-# Canal\n` +
                    `**${channelName}**\n` +
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
                new TextDisplayBuilder().setContent(
                    '-# VTL Security Bot'
                )
            );

            // ==================================
            // ENVIAR
            // ==================================

            await logChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
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