const {
    Client,
    GatewayIntentBits,
    Partials,
    AuditLogEvent,
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

// ===============================
// CONFIGURAÇÕES
// ===============================

const TOKEN = process.env.TOKEN;

const LOG_CHANNEL_ID = '1556626740569444422';

const ALLOWED_INVITE_CATEGORIES = [
    '1554482905147904070',
    '1552649476370604214'
];

// ===============================
// READY
// ===============================

client.once('ready', () => {
    console.log(`✅ VTL Security Bot online como ${client.user.tag}`);
});

// ===============================
// DETECTAR CONVITES
// ===============================

function containsDiscordInvite(content) {
    if (!content) return false;

    const inviteRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/i;

    return inviteRegex.test(content);
}

// ===============================
// MENSAGENS NOVAS
// ===============================

client.on('messageCreate', async (message) => {
    try {
        if (!message.guild) return;
        if (message.author.bot) return;

        // Verifica se é link de convite
        if (containsDiscordInvite(message.content)) {

            // Verifica a categoria do canal
            const categoryId = message.channel.parentId;

            // Se estiver em uma categoria permitida, não bloqueia
            if (ALLOWED_INVITE_CATEGORIES.includes(categoryId)) {
                return;
            }

            // Apaga a mensagem
            try {
                await message.delete();
            } catch (err) {
                console.log('Não foi possível apagar a mensagem:', err.message);
            }

            // Container de aviso
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

            // Tenta responder de forma ephemeral
            try {
                await message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            } catch (err) {
                console.log(
                    'Não foi possível enviar aviso ephemeral:',
                    err.message
                );
            }
        }

    } catch (error) {
        console.error('Erro no messageCreate:', error);
    }
});

// ===============================
// MENSAGEM EXCLUÍDA
// ===============================

client.on('messageDelete', async (message) => {
    try {
        if (!message.guild) return;
        if (message.author?.bot) return;

        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) {
            console.log('❌ Canal de logs não encontrado.');
            return;
        }

        // Autor da mensagem
        const author = message.author;

        const authorMention = author
            ? `<@${author.id}>`
            : 'Usuário desconhecido';

        const authorId = author
            ? author.id
            : 'desconhecido';

        // Conteúdo
        let content = message.content || '*Mensagem sem conteúdo de texto*';

        // Limita o tamanho para evitar erro
        if (content.length > 3500) {
            content = content.slice(0, 3500) + '...';
        }

        // Escapa blocos de código
        content = content.replace(/```/g, '\\`\\`\\`');

        // Container principal
        const container = new ContainerBuilder();

        // Avatar do autor
        if (author) {
            const avatarURL = author.displayAvatarURL({
                extension: 'png',
                size: 256
            });

            const mediaGallery = new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(avatarURL)
                );

            container.addMediaGalleryComponents(mediaGallery);
        }

        // Separador
        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // Conteúdo do log
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Mensagem excluída por ${authorMention} (\`${authorId}\`):**\n\`\`\`\n${content}\n\`\`\``
            )
        );

        // Anexos
        if (message.attachments && message.attachments.size > 0) {
            let attachmentsText = '**Anexos:**\n';

            message.attachments.forEach((attachment) => {
                attachmentsText += `- [${attachment.name}](${attachment.url})\n`;
            });

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    attachmentsText
                )
            );
        }

        // Separador final
        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // Footer
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
        console.error('Erro no messageDelete:', error);
    }
});

// ===============================
// MENSAGEM EDITADA
// ===============================

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild) return;

        if (newMessage.author?.bot) return;

        // Se não houver alteração no conteúdo
        if (oldMessage.content === newMessage.content) return;

        const logChannel =
            newMessage.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) return;

        const author = newMessage.author;

        const authorMention = author
            ? `<@${author.id}>`
            : 'Usuário desconhecido';

        const authorId = author
            ? author.id
            : 'desconhecido';

        let oldContent =
            oldMessage.content || '*Sem conteúdo*';

        let newContent =
            newMessage.content || '*Sem conteúdo*';

        if (oldContent.length > 1500) {
            oldContent = oldContent.slice(0, 1500) + '...';
        }

        if (newContent.length > 1500) {
            newContent = newContent.slice(0, 1500) + '...';
        }

        oldContent = oldContent.replace(/```/g, '\\`\\`\\`');
        newContent = newContent.replace(/```/g, '\\`\\`\\`');

        const container = new ContainerBuilder();

        // Avatar
        if (author) {
            const avatarURL = author.displayAvatarURL({
                extension: 'png',
                size: 256
            });

            const mediaGallery = new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(avatarURL)
                );

            container.addMediaGalleryComponents(mediaGallery);
        }

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Mensagem editada por ${authorMention} (\`${authorId}\`):**\n\n` +
                `**Antes:**\n\`\`\`\n${oldContent}\n\`\`\`\n\n` +
                `**Depois:**\n\`\`\`\n${newContent}\n\`\`\``
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
        console.error('Erro no messageUpdate:', error);
    }
});

// ===============================
// LOGIN
// ===============================

client.login(TOKEN);