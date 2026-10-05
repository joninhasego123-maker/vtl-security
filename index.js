const {
    Client,
    GatewayIntentBits,
    Partials,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');

require('./keep_alive');

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
// BLOQUEIO DE CONVITES
// ==========================================

client.on('messageCreate', async (message) => {
    try {
        if (!message.guild) return;
        if (message.author.bot) return;

        if (!containsDiscordInvite(message.content)) return;

        const categoryId = message.channel.parentId;

        // Categorias onde convites são permitidos
        if (ALLOWED_INVITE_CATEGORIES.includes(categoryId)) {
            return;
        }

        // Apagar mensagem
        try {
            await message.delete();
        } catch (error) {
            console.log(
                '❌ Não foi possível apagar a mensagem:',
                error.message
            );
        }

        // Aviso
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
            await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.log(
                '❌ Não foi possível enviar o aviso:',
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

        // Não registrar mensagens do próprio bot
        if (message.author?.bot) return;

        const logChannel =
            message.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) {
            console.log('❌ Canal de logs não encontrado.');
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

        const channelName = message.channel?.name
            ? message.channel.name
            : 'Canal desconhecido';

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

        content =
            content.replace(/```/g, '\\`\\`\\`');

        // ======================================
        // CONTAINER
        // ======================================

        const container = new ContainerBuilder();

        // ======================================
        // IMAGEM ANEXADA
        // ======================================

        if (
            message.attachments &&
            message.attachments.size > 0
        ) {
            const firstAttachment =
                message.attachments.first();

            if (
                firstAttachment &&
                firstAttachment.contentType?.startsWith('image/')
            ) {
                const mediaGallery =
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(firstAttachment.url)
                        );

                container.addMediaGalleryComponents(
                    mediaGallery
                );
            }
        }

        // ======================================
        // SEPARADOR
        // ======================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ======================================
        // INFORMAÇÕES
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## 🗑 Mensagem Deletada\n\n` +

                `-# Canal\n` +
                `**${channelName}**\n\n` +

                `-# User\n` +
                `${authorMention} (\`${authorId}\`)\n\n` +

                `-# Mensagem\n` +
                `\`\`\`\n${content}\n\`\`\``
            )
        );

        // ======================================
        // ANEXOS
        // ======================================

        if (
            message.attachments &&
            message.attachments.size > 0
        ) {
            let attachmentsText =
                '**Anexos:**\n';

            message.attachments.forEach(
                (attachment) => {
                    attachmentsText +=
                        `- [${attachment.name}](${attachment.url})\n`;
                }
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    attachmentsText
                )
            );
        }

        // ======================================
        // SEPARADOR FINAL
        // ======================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ======================================
        // FOOTER
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                'VTL Security Bot'
            )
        );

        // ======================================
        // ENVIAR LOG
        // ======================================

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

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild) return;

        // Não registrar mensagens do próprio bot
        if (newMessage.author?.bot) return;

        // Se o conteúdo não mudou, não registrar
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
            console.log('❌ Canal de logs não encontrado.');
            return;
        }

        // ======================================
        // AUTOR
        // ======================================

        const author = newMessage.author;

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
            newMessage.channel?.name
                ? newMessage.channel.name
                : 'Canal desconhecido';

        // ======================================
        // MENSAGEM ANTIGA
        // ======================================

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

        // ======================================
        // MENSAGEM NOVA
        // ======================================

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

        // ======================================
        // CONTAINER
        // ======================================

        const container =
            new ContainerBuilder();

        // ======================================
        // SEPARADOR
        // ======================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ======================================
        // INFORMAÇÕES
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## 📝 Mensagem editada\n\n` +

                `-# Canal\n` +
                `**${channelName}**\n\n` +

                `-# User\n` +
                `${authorMention} (\`${authorId}\`)\n\n` +

                `-# Mensagem Antiga\n` +
                `\`\`\`\n${oldContent}\n\`\`\`\n\n` +

                `-# Mensagem nova\n` +
                `\`\`\`\n${newContent}\n\`\`\``
            )
        );

        // ======================================
        // SEPARADOR FINAL
        // ======================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ======================================
        // FOOTER
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                'VTL Security Bot'
            )
        );

        // ======================================
        // ENVIAR LOG
        // ======================================

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
});

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);