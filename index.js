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

        // Categoria do canal
        const categoryId = message.channel.parentId;

        // Categorias onde convites são permitidos
        if (ALLOWED_INVITE_CATEGORIES.includes(categoryId)) {
            return;
        }

        // Apaga a mensagem
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

        /*
         * OBS:
         * Mensagens normais enviadas pelo bot não conseguem
         * ser ephemeral.
         *
         * Para fazer um aviso realmente ephemeral,
         * seria necessário usar uma interação.
         *
         * Aqui o bot envia a mensagem normalmente.
         */

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
        console.error('Erro no bloqueio de convites:', error);
    }
});

// ==========================================
// LOG DE MENSAGEM EXCLUÍDA
// ==========================================

client.on('messageDelete', async (message) => {
    try {
        if (!message.guild) return;

        // Não registra mensagens do próprio bot
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
        // CONTEÚDO
        // ======================================

        let content =
            message.content || '*Mensagem sem conteúdo de texto*';

        if (content.length > 3500) {
            content =
                content.slice(0, 3500) + '...';
        }

        // Evita quebrar o bloco de código
        content = content.replace(/```/g, '\\`\\`\\`');

        // ======================================
        // CONTAINER
        // ======================================

        const container = new ContainerBuilder();

        // ======================================
        // FOTO / AVATAR
        // ======================================

        if (author) {
            const avatarURL = author.displayAvatarURL({
                extension: 'png',
                size: 256
            });

            const mediaGallery =
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(avatarURL)
                    );

            container.addMediaGalleryComponents(
                mediaGallery
            );
        }

        // ======================================
        // SEPARADOR
        // ======================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ======================================
        // MENSAGEM
        // ======================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Mensagem excluída por: ${authorMention} (\`${authorId}\`)**\n` +
                `\`\`\`\n${content}\n\`\`\`\n\n` +
                `**Canal que a mensagem foi excluída:** <#${message.channelId}>`
            )
        );

        // ======================================
        // ANEXOS
        // ======================================

        if (
            message.attachments &&
            message.attachments.size > 0
        ) {
            let attachmentsText = '**Anexos:**\n';

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
                '-# VTL Security Bot'
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
// LOG DE MENSAGEM EDITADA
// ==========================================

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild) return;

        if (newMessage.author?.bot) return;

        // Se o conteúdo não mudou
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

        if (!logChannel) return;

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

        const container = new ContainerBuilder();

        // Avatar
        if (author) {
            const avatarURL =
                author.displayAvatarURL({
                    extension: 'png',
                    size: 256
                });

            const mediaGallery =
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(avatarURL)
                    );

            container.addMediaGalleryComponents(
                mediaGallery
            );
        }

        // Separador
        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // Conteúdo
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Mensagem editada por: ${authorMention} (\`${authorId}\`)**\n\n` +
                `**Antes:**\n` +
                `\`\`\`\n${oldContent}\n\`\`\`\n\n` +
                `**Depois:**\n` +
                `\`\`\`\n${newContent}\n\`\`\`\n\n` +
                `**Canal:** <#${newMessage.channelId}>`
            )
        );

        // Separador
        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // Footer
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# VTL Security Bot'
            )
        );

        // Enviar
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