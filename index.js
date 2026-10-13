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
    AttachmentBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const config = require('./config');

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

const TOKEN = process.env.TOKEN;

// =========================
// CONFIGURAÇÕES DE SEGURANÇA
// =========================

const LOG_CHANNEL_ID = '1556626740569444422';
const WARN_LOG_CHANNEL_ID = '1554500648450392155';

const ALLOWED_INVITE_CATEGORIES = [
    '1554482905147904070',
    '1552649476370604214'
];

const WARN_1_ROLE_ID = '1556667619291955230';
const WARN_2_ROLE_ID = '1556667697616519230';

const WARN_ALLOWED_ROLES = [
    '1552650098637541448',
    '1554508476510900226'
];

const STJD_URL = 'https://discord.gg/zXdZ9SwTG';
const BOT_FOOTER = '-# PML • System';

const securityDeletedMessages = new Set();

// =========================
// CONFIGURAÇÕES DE TICKETS
// =========================

const TICKET_CATEGORY_ID = config.TICKET_CATEGORY_ID;

// Cargo de staff corrigido
const STAFF_ROLE_ID = '1558824924120879216';

// Canal onde o painel será enviado
const TICKET_PANEL_CHANNEL_ID = '1556721027940352070';

const TICKET_FOOTER = '-# PML • TICKET SYSTEM';

const TICKET_DENUNCIA = 'ticket_denuncia';
const TICKET_APPEAL = 'ticket_appeal';

const TICKET_SELECT = 'ticket_tipo_select';

const CLOSE_TICKET = 'fechar_ticket';
const CONFIRM_CLOSE_TICKET = 'confirmar_fechar_ticket';
const CANCEL_CLOSE_TICKET = 'cancelar_fechar_ticket';

// =========================
// SLASH COMMANDS
// =========================

const commands = [
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Aplica uma advertência a um membro.')
        .addUserOption(option =>
            option
                .setName('membro')
                .setDescription('Membro que receberá a advertência.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo da advertência.')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove uma advertência de um membro.')
        .addUserOption(option =>
            option
                .setName('membro')
                .setDescription('Membro que terá uma advertência removida.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo da remoção da advertência.')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um membro do servidor.')
        .addUserOption(option =>
            option
                .setName('membro')
                .setDescription('Membro que será banido.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo do banimento.')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Envia uma mensagem em um canal escolhido.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addStringOption(option =>
            option
                .setName('mensagem')
                .setDescription('Mensagem que o bot vai enviar.')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal onde a mensagem será enviada.')
                .setRequired(true)
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement
                )
        ),

    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Envia o painel de atendimento de tickets.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
].map(command => command.toJSON());

// =========================
// REGISTRAR COMANDOS
// =========================

async function registerCommands() {
    try {
        const rest = new REST({
            version: '10'
        }).setToken(TOKEN);

        console.log('🔄 Registrando comandos...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands
            }
        );

        console.log('✅ Comandos registrados com sucesso.');
    } catch (error) {
        console.error(
            '❌ Erro ao registrar comandos:',
            error
        );
    }
}

// =========================
// READY
// =========================

client.once('ready', async () => {
    console.log(
        `✅ PML • Bot Security online como ${client.user.tag}`
    );

    await registerCommands();
});

// =========================
// DETECTAR CONVITES DISCORD
// =========================

function containsDiscordInvite(content) {
    if (!content) return false;

    const inviteRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/i;

    return inviteRegex.test(content);
}

// =========================
// PREVIEW DA MENSAGEM
// =========================

async function createMessagePreview(message) {
    const width = 1000;
    const height = 190;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, width, height);

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

    const username =
        message.author?.displayName ||
        message.author?.username ||
        'Usuário';

    ctx.font = 'bold 31px Arial';
    ctx.fillStyle = '#f2f3f5';
    ctx.fillText(username, 165, 70);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#949ba4';

    const dateText = message.createdAt
        ? `Hoje às ${message.createdAt.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })}`
        : 'Mensagem';

    ctx.fillText(dateText, 165, 101);

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
    ctx.fillText(content, 165, 145);

    return canvas.encode('png');
}

// =========================
// BLOQUEIO DE CONVITES
// =========================

client.on('messageCreate', async message => {
    try {
        if (!message.guild || message.author.bot) return;

        if (!containsDiscordInvite(message.content)) return;

        if (
            ALLOWED_INVITE_CATEGORIES.includes(
                message.channel.parentId
            )
        ) {
            return;
        }

        securityDeletedMessages.add(message.id);

        setTimeout(() => {
            securityDeletedMessages.delete(message.id);
        }, 10000);

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
                    BOT_FOOTER
                )
            );

        try {
            const warning = await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            setTimeout(async () => {
                try {
                    await warning.delete();
                } catch (error) {}
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

// =========================
// LOG DE MENSAGEM DELETADA
// =========================

client.on('messageDelete', async message => {
    try {
        if (!message.guild) return;

        if (securityDeletedMessages.has(message.id)) {
            securityDeletedMessages.delete(message.id);
            return;
        }

        if (message.author?.bot) return;

        const logChannel =
            message.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) {
            console.log('❌ Canal de logs não encontrado.');
            return;
        }

        const author = message.author;

        const authorMention = author
            ? `<@${author.id}>`
            : 'Usuário desconhecido';

        const authorId = author
            ? author.id
            : 'desconhecido';

        let content =
            message.content ||
            '*Mensagem sem conteúdo de texto*';

        if (content.length > 3000) {
            content = content.slice(0, 3000) + '...';
        }

        content = content.replace(/```/g, '\\`\\`\\`');

        const imageAttachments = [];

        if (message.attachments?.size) {
            message.attachments.forEach(attachment => {
                const isImage =
                    attachment.contentType?.startsWith('image/') ||
                    /\.(png|jpg|jpeg|gif|webp)$/i.test(
                        attachment.name || ''
                    );

                if (isImage) {
                    imageAttachments.push(attachment.url);
                }
            });
        }

        let previewBuffer = null;

        try {
            previewBuffer = await createMessagePreview(message);
        } catch (error) {
            console.log(
                '⚠️ Erro ao criar preview:',
                error.message
            );
        }

        const container = new ContainerBuilder();

        if (previewBuffer) {
            const mediaGallery = new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(
                            'attachment://mensagem-deletada.png'
                        )
                );

            container.addMediaGalleryComponents(mediaGallery);
        }

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        let logText =
            `## 🗑 Mensagem Deletada\n` +
            `-# Canal\n` +
            `<#${message.channelId}>\n` +
            `-# User\n` +
            `${authorMention} (\`${authorId}\`)\n` +
            `-# Mensagem\n` +
            `\`\`\`\n${content}\n\`\`\``;

        if (imageAttachments.length > 0) {
            logText += '\n-# Imagem';

            for (const url of imageAttachments) {
                logText += `\n${url}`;
            }
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(logText)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(BOT_FOOTER)
        );

        if (previewBuffer) {
            const previewAttachment = new AttachmentBuilder(
                previewBuffer,
                {
                    name: 'mensagem-deletada.png'
                }
            );

            await logChannel.send({
                files: [previewAttachment],
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            await logChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    } catch (error) {
        console.error(
            '❌ Erro no messageDelete:',
            error
        );
    }
});

// =========================
// LOG DE MENSAGEM EDITADA
// =========================

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (!newMessage.guild || newMessage.author?.bot) return;

        if (oldMessage.content === newMessage.content) return;

        const logChannel =
            newMessage.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) {
            console.log('❌ Canal de logs não encontrado.');
            return;
        }

        const author = newMessage.author;

        const authorMention = author
            ? `<@${author.id}>`
            : 'Usuário desconhecido';

        const authorId = author
            ? author.id
            : 'desconhecido';

        let oldContent = oldMessage.content || '*Sem conteúdo*';

        if (oldContent.length > 1500) {
            oldContent = oldContent.slice(0, 1500) + '...';
        }

        oldContent = oldContent.replace(/```/g, '\\`\\`\\`');

        let newContent = newMessage.content || '*Sem conteúdo*';

        if (newContent.length > 1500) {
            newContent = newContent.slice(0, 1500) + '...';
        }

        newContent = newContent.replace(/```/g, '\\`\\`\\`');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
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
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(BOT_FOOTER)
            );

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

// =========================
// FUNÇÕES DO SISTEMA DE WARN
// =========================

function canUseWarn(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    return WARN_ALLOWED_ROLES.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

async function sendWarnLog(guild, container) {
    try {
        const channel =
            guild.channels.cache.get(WARN_LOG_CHANNEL_ID);

        if (!channel) {
            console.log(
                '❌ Canal de logs de warn não encontrado.'
            );
            return;
        }

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error(
            '❌ Erro ao enviar log do warn:',
            error
        );
    }
}

async function sendWarnDM(member, content) {
    try {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `${content}\n\n${BOT_FOOTER}`
                )
            );

        await member.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.log(
            `⚠️ Não foi possível enviar DM para ${member.user.tag}.`
        );
    }
}

// =========================
// SISTEMA DE TICKETS
// =========================

function criarPainelTicket() {
    const topoPath = path.join(
        __dirname,
        'imagens',
        'ticket_topo.png'
    );

    const logoPath = path.join(
        __dirname,
        'imagens',
        'utl_logo.png'
    );

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://ticket_topo.png')
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '## 🎫 Central de Atendimento\n\n' +
                'Selecione uma opção abaixo para entrar em contato com a equipe da PML.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '📢 **Denúncia** — Denuncie um membro ou apresente uma situação à equipe.\n' +
                '⚖️ **Appeal** — Solicite uma revisão de uma punição.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        );

    const menu = new StringSelectMenuBuilder()
        .setCustomId(TICKET_SELECT)
        .setPlaceholder('Selecione o tipo de atendimento...')
        .addOptions(
            {
                label: 'Denúncia',
                description: 'Enviar uma denúncia à equipe.',
                value: TICKET_DENUNCIA,
                emoji: '📢'
            },
            {
                label: 'Appeal',
                description: 'Solicitar revisão de uma punição.',
                value: TICKET_APPEAL,
                emoji: '⚖️'
            }
        );

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(menu)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(TICKET_FOOTER)
    );

    return {
        container,
        files: [
            {
                attachment: topoPath,
                name: 'ticket_topo.png'
            },
            {
                attachment: logoPath,
                name: 'utl_logo.png'
            }
        ]
    };
}

// =========================
// CONTAINER DO TICKET ABERTO
// =========================

function criarTicketContainer({ user, tipo, conteudo }) {
    const ticketImagePath = path.join(
        __dirname,
        'imagens',
        'ticket_aberto_v2.png'
    );

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL('attachment://ticket_aberto_v2.png')
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## 🎫 TICKET ABERTO\n\n` +
                `**Usuário:** ${user}\n` +
                `**ID:** \`${user.id}\`\n\n` +
                `**Tipo:** ${tipo}`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Atendimento:** <@&${STAFF_ROLE_ID}>\n\n${conteudo}`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CLOSE_TICKET)
                    .setLabel('Fechar Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(TICKET_FOOTER)
        );

    return {
        container,
        files: [
            {
                attachment: ticketImagePath,
                name: 'ticket_aberto_v2.png'
            }
        ]
    };
}

// =========================
// CRIAR CANAL DE TICKET
// =========================

async function criarCanalTicket(interaction, tipo, conteudo) {
    const guild = interaction.guild;

    if (!guild) {
        return interaction.reply({
            content: '❌ Este sistema só pode ser usado dentro do servidor.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!TICKET_CATEGORY_ID || !STAFF_ROLE_ID) {
        return interaction.reply({
            content: '❌ A categoria de tickets não está configurada. Confira TICKET_CATEGORY_ID no config.js.',
            flags: MessageFlags.Ephemeral
        });
    }

    const ticketExistente = guild.channels.cache.find(
        channel =>
            channel.parentId === TICKET_CATEGORY_ID &&
            channel.topic === `ticket:${interaction.user.id}`
    );

    if (ticketExistente) {
        return interaction.reply({
            content: `❌ Você já possui um ticket aberto: ${ticketExistente}`,
            flags: MessageFlags.Ephemeral
        });
    }

    let channel;

    try {
        channel = await guild.channels.create({
            name:
                `ticket-${interaction.user.username}`
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .slice(0, 90) ||
                `ticket-${interaction.user.id}`,

            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            topic: `ticket:${interaction.user.id}`,

            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ]
        });
    } catch (error) {
        console.error(
            '❌ Erro ao criar canal de ticket:',
            error
        );

        return interaction.reply({
            content: '❌ Não consegui criar o canal do ticket. Verifique as permissões do bot e a categoria configurada.',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        const ticket = criarTicketContainer({
            user: interaction.user,
            tipo,
            conteudo
        });

        await channel.send({
            components: [ticket.container],
            files: ticket.files,
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error(
            '❌ Erro ao enviar painel do ticket:',
            error
        );

        await channel.delete().catch(() => {});

        return interaction.reply({
            content: '❌ Não foi possível configurar o ticket. Verifique se as imagens existem na pasta imagens e as permissões do bot.',
            flags: MessageFlags.Ephemeral
        });
    }

    return interaction.reply({
        content: `✅ Seu ticket foi criado: ${channel}`,
        flags: MessageFlags.Ephemeral
    });
}

// =========================
// MODAL DE DENÚNCIA
// =========================

function abrirModalDenuncia(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_ticket_denuncia')
        .setTitle('Denúncia');

    const denunciado = new TextInputBuilder()
        .setCustomId('denunciado')
        .setLabel('Quem você deseja denunciar?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const motivo = new TextInputBuilder()
        .setCustomId('motivo_denuncia')
        .setLabel('Explique o motivo da denúncia')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

    const provas = new TextInputBuilder()
        .setCustomId('provas_denuncia')
        .setLabel('Links de provas (se houver)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(denunciado),
        new ActionRowBuilder().addComponents(motivo),
        new ActionRowBuilder().addComponents(provas)
    );

    return interaction.showModal(modal);
}

// =========================
// MODAL DE APPEAL
// =========================

function abrirModalAppeal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_ticket_appeal')
        .setTitle('Appeal');

    const punicao = new TextInputBuilder()
        .setCustomId('punicao_appeal')
        .setLabel('Qual punição você deseja recorrer?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(150);

    const motivo = new TextInputBuilder()
        .setCustomId('motivo_appeal')
        .setLabel('Por que devemos revisar a punição?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(punicao),
        new ActionRowBuilder().addComponents(motivo)
    );

    return interaction.showModal(modal);
}

// =========================
// CONFIRMAÇÃO DE FECHAMENTO
// =========================

function criarContainerConfirmacao(user) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `⚠️ | ${user} Você tem certeza que deseja fechar esse ticket?`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIRM_CLOSE_TICKET)
                    .setLabel('Sim')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(CANCEL_CLOSE_TICKET)
                    .setLabel('Não')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(TICKET_FOOTER)
        );
}

function criarContainerCancelado() {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '⚠️ | Fechamento do ticket cancelado'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(TICKET_FOOTER)
        );
}

// =========================
// VERIFICAR STAFF
// =========================

function isStaff(interaction) {
    if (!interaction.inGuild() || !interaction.member) {
        return false;
    }

    if (
        interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    return Boolean(
        interaction.member.roles?.cache?.has(STAFF_ROLE_ID)
    );
}

// =========================
// PROCESSAR INTERAÇÕES DE TICKET
// =========================

async function handleTicketInteraction(interaction) {
    // MENU DE SELEÇÃO

    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === TICKET_SELECT
    ) {
        const choice = interaction.values[0];

        if (choice === TICKET_DENUNCIA) {
            return abrirModalDenuncia(interaction);
        }

        if (choice === TICKET_APPEAL) {
            return abrirModalAppeal(interaction);
        }

        return true;
    }

    // BOTÃO FECHAR

    if (
        interaction.isButton() &&
        interaction.customId === CLOSE_TICKET
    ) {
        if (!isStaff(interaction)) {
            return interaction.reply({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '❌ Apenas a equipe responsável pode fechar este ticket.'
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                TICKET_FOOTER
                            )
                        )
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }

        return interaction.reply({
            components: [
                criarContainerConfirmacao(interaction.user)
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    // CONFIRMAR FECHAMENTO

    if (
        interaction.isButton() &&
        interaction.customId === CONFIRM_CLOSE_TICKET
    ) {
        if (!isStaff(interaction)) {
            return interaction.reply({
                content: '❌ Apenas a equipe responsável pode fechar este ticket.',
                flags: MessageFlags.Ephemeral
            });
        }

        const channel = interaction.channel;

        if (!channel || !channel.deletable) {
            return interaction.reply({
                content: '❌ Não consegui fechar este canal. Verifique as permissões do bot.',
                flags: MessageFlags.Ephemeral
            });
        }

        const criarContagem = numero =>
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `⚠️ | Fechando esse ticket em ${numero}...`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        TICKET_FOOTER
                    )
                );

        await interaction.update({
            components: [criarContagem(3)]
        });

        for (const numero of [2, 1]) {
            await new Promise(resolve =>
                setTimeout(resolve, 1000)
            );

            await interaction.editReply({
                components: [criarContagem(numero)]
            });
        }

        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        );

        await channel.delete(
            'Ticket fechado pela equipe da PML'
        ).catch(error => {
            console.error(
                '❌ Erro ao fechar ticket:',
                error
            );
        });

        return true;
    }

    // CANCELAR FECHAMENTO

    if (
        interaction.isButton() &&
        interaction.customId === CANCEL_CLOSE_TICKET
    ) {
        if (!isStaff(interaction)) {
            return interaction.reply({
                content: '❌ Apenas a equipe responsável pode cancelar o fechamento.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.update({
            components: [criarContainerCancelado()]
        });

        return true;
    }

    // ENVIAR MODAL DE DENÚNCIA

    if (
        interaction.isModalSubmit() &&
        interaction.customId === 'modal_ticket_denuncia'
    ) {
        const denunciado =
            interaction.fields.getTextInputValue('denunciado');

        const motivo =
            interaction.fields.getTextInputValue('motivo_denuncia');

        const provas =
            interaction.fields.getTextInputValue('provas_denuncia') ||
            'Não informado.';

        const conteudo =
            `**Denunciado:**\n${denunciado}\n\n` +
            `**Motivo:**\n${motivo}\n\n` +
            `**Provas/links:**\n${provas}`;

        return criarCanalTicket(
            interaction,
            'Denúncia',
            conteudo
        );
    }

    // ENVIAR MODAL DE APPEAL

    if (
        interaction.isModalSubmit() &&
        interaction.customId === 'modal_ticket_appeal'
    ) {
        const punicao =
            interaction.fields.getTextInputValue('punicao_appeal');

        const motivo =
            interaction.fields.getTextInputValue('motivo_appeal');

        const conteudo =
            `**Punição contestada:**\n${punicao}\n\n` +
            `**Motivo do recurso:**\n${motivo}`;

        return criarCanalTicket(
            interaction,
            'Appeal',
            conteudo
        );
    }

    return false;
}

// =========================
// EXECUTAR /TICKET
// =========================

async function executarTicketCommand(interaction) {
    if (
        !interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.reply({
            content: '❌ Você precisa ter **Administrador** para usar este comando.',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        const canalPainel =
            await interaction.client.channels.fetch(
                TICKET_PANEL_CHANNEL_ID
            );

        if (
            !canalPainel ||
            !canalPainel.isTextBased() ||
            !canalPainel.guild
        ) {
            return interaction.reply({
                content: '❌ Não foi possível encontrar o canal configurado para o painel de tickets.',
                flags: MessageFlags.Ephemeral
            });
        }

        const painel = criarPainelTicket();

        await canalPainel.send({
            components: [painel.container],
            files: painel.files,
            flags: MessageFlags.IsComponentsV2
        });

        return interaction.reply({
            content: `✅ Painel de tickets enviado em <#${TICKET_PANEL_CHANNEL_ID}>.`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error(
            '❌ Erro ao enviar painel de tickets:',
            error
        );

        return interaction.reply({
            content: '❌ Não foi possível enviar o painel. Verifique as permissões do bot e se os arquivos de imagem existem.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// =========================
// INTERAÇÕES: TICKETS, /SAY, /BAN E /WARN
// =========================

client.on('interactionCreate', async interaction => {
    try {
        // Processar menus, botões e modais primeiro.
        const ticketHandled =
            await handleTicketInteraction(interaction);

        if (ticketHandled) return;

        if (!interaction.isChatInputCommand()) return;

        // =========================
        // COMANDO /TICKET
        // =========================

        if (interaction.commandName === 'ticket') {
            return executarTicketCommand(interaction);
        }

        // =========================
        // COMANDO /SAY
        // =========================

        if (interaction.commandName === 'say') {
            if (
                !interaction.memberPermissions?.has(
                    PermissionFlagsBits.Administrator
                )
            ) {
                return interaction.reply({
                    content: '❌ Você precisa ter permissão de **Administrador** para usar este comando.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const mensagem =
                interaction.options.getString('mensagem');

            const canal =
                interaction.options.getChannel('canal');

            if (
                !canal ||
                !canal.isTextBased() ||
                typeof canal.send !== 'function'
            ) {
                return interaction.reply({
                    content: '❌ Selecione um canal de texto válido.',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                await canal.send({
                    content: mensagem,
                    allowedMentions: {
                        parse: ['users', 'roles']
                    }
                });

                return interaction.reply({
                    content: `✅ Mensagem enviada com sucesso em ${canal}.`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error(
                    '❌ Erro no comando /say:',
                    error
                );

                return interaction.reply({
                    content: '❌ Não consegui enviar a mensagem. Verifique se o bot tem permissão para visualizar o canal e enviar mensagens nele.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // =========================
        // COMANDO /BAN
        // =========================

        if (interaction.commandName === 'ban') {
            if (!canUseWarn(interaction.member)) {
                return interaction.reply({
                    content: '❌ Você não possui permissão para usar este comando.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const banTarget =
                interaction.options.getUser('membro');

            const banReason =
                interaction.options.getString('motivo');

            if (banTarget.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ Você não pode banir a si mesmo.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (banTarget.id === client.user.id) {
                return interaction.reply({
                    content: '❌ Eu não posso me banir.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (banTarget.id === interaction.guild.ownerId) {
                return interaction.reply({
                    content: '❌ Não é possível banir o dono do servidor.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const banMember = await interaction.guild.members
                .fetch(banTarget.id)
                .catch(() => null);

            if (banMember) {
                if (
                    banMember.roles.highest.position >=
                        interaction.member.roles.highest.position &&
                    interaction.guild.ownerId !== interaction.user.id
                ) {
                    return interaction.reply({
                        content: '❌ Você não pode banir um membro com cargo igual ou superior ao seu.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (!banMember.bannable) {
                    return interaction.reply({
                        content: '❌ Não consigo banir esse membro. Verifique a hierarquia de cargos do bot.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const banStaffMention = `<@${interaction.user.id}>`;
            const banMemberMention = `<@${banTarget.id}>`;

            const banLogContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔨 Banimento aplicado!\n` +
                        `**🛠️ Staff**\n${banStaffMention} (\`${interaction.user.id}\`)\n` +
                        `**👤 Membro**\n${banMemberMention} (\`${banTarget.id}\`)\n` +
                        `**📌 Motivo**\n${banReason}\n` +
                        `**ℹ️ Info**\nBanimento direto.`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            const banStjdButton = new ButtonBuilder()
                .setLabel('STJD')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Link)
                .setURL(STJD_URL);

            const banMemberDMContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔨 Você foi **BANIDO** da PML\n\n` +
                        `-# 🛠️ Staff\n${banStaffMention} (\`${interaction.user.id}\`)\n` +
                        `-# 📌 Motivo\n${banReason}\n\n` +
                        `> Para ser desbanido entre no STJD da PML clicando no botão abaixo e abra um ticket.`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(banStjdButton)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            // A DM precisa ser enviada ANTES do ban
            if (banMember) {
                try {
                    await banMember.send({
                        components: [banMemberDMContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    console.log(
                        `⚠️ Não foi possível enviar DM para ${banTarget.tag}.`
                    );
                }
            }

            try {
                await interaction.guild.members.ban(banTarget.id, {
                    deleteMessageSeconds: 0,
                    reason: `Ban por ${interaction.user.tag}: ${banReason}`
                });
            } catch (error) {
                console.error(
                    '❌ Erro ao banir membro:',
                    error
                );

                return interaction.editReply({
                    content: '❌ Não consegui banir o membro. Verifique a hierarquia e as permissões do bot.'
                });
            }

            await sendWarnLog(
                interaction.guild,
                banLogContainer
            );

            return interaction.editReply({
                content: `🔨 ${banMemberMention} foi banido da PML.`
            });
        }

        // =========================
        // COMANDO /UNWARN
        // =========================

        if (interaction.commandName === 'unwarn') {
            if (!canUseWarn(interaction.member)) {
                return interaction.reply({
                    content: '❌ Você não possui permissão para usar este comando.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const unwarnUser =
                interaction.options.getUser('membro');

            const unwarnReason =
                interaction.options.getString('motivo');

            const unwarnMember = await interaction.guild.members
                .fetch(unwarnUser.id)
                .catch(() => null);

            if (!unwarnMember) {
                return interaction.reply({
                    content: '❌ Esse membro não está no servidor.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (unwarnUser.bot) {
                return interaction.reply({
                    content: '❌ Você não pode remover warn de um bot.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (unwarnUser.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ Você não pode remover o seu próprio warn.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (
                unwarnMember.roles.highest.position >=
                    interaction.member.roles.highest.position &&
                interaction.guild.ownerId !== interaction.user.id
            ) {
                return interaction.reply({
                    content: '❌ Você não pode remover warn de um membro com cargo igual ou superior ao seu.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const unwarnHasWarn1 =
                unwarnMember.roles.cache.has(WARN_1_ROLE_ID);

            const unwarnHasWarn2 =
                unwarnMember.roles.cache.has(WARN_2_ROLE_ID);

            if (!unwarnHasWarn1 && !unwarnHasWarn2) {
                return interaction.reply({
                    content: '❌ Esse membro não possui nenhuma advertência.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Tem 2 warns -> remove o cargo do warn 2 (fica com 1/3)
            // Tem 1 warn  -> remove o cargo do warn 1 (fica com 0/3)
            const unwarnRoleId = unwarnHasWarn2
                ? WARN_2_ROLE_ID
                : WARN_1_ROLE_ID;

            const unwarnTotal = unwarnHasWarn2 ? 1 : 0;

            try {
                await unwarnMember.roles.remove(unwarnRoleId);
            } catch (error) {
                console.error(
                    '❌ Erro ao remover cargo de warn:',
                    error
                );

                return interaction.reply({
                    content: '❌ Não consegui remover o cargo do warn. Verifique a hierarquia dos cargos do bot.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Remove também o mute aplicado pelo warn
            try {
                await unwarnMember.timeout(
                    null,
                    `Unwarn: ${unwarnReason}`
                );
            } catch (error) {
                console.log(
                    '⚠️ Não foi possível remover o mute:',
                    error.message
                );
            }

            const unwarnStaffMention = `<@${interaction.user.id}>`;
            const unwarnMemberMention = `<@${unwarnMember.id}>`;

            const unwarnLogContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ✅ Advertência Removida\n\n` +
                        `-# 🛠️ Staff\n${unwarnStaffMention} (\`${interaction.user.id}\`)\n` +
                        `-# 👤 Membro\n${unwarnMemberMention} (\`${unwarnMember.id}\`)\n` +
                        `-# 📌 Motivo\n${unwarnReason}\n` +
                        `-# ℹ️ Info\n${unwarnTotal}/3 • Advertência removida`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            await sendWarnLog(
                interaction.guild,
                unwarnLogContainer
            );

            await sendWarnDM(
                unwarnMember,
                `✅ Uma advertência sua na PML foi removida.\n\n` +
                `-# 🛠️ Staff\n${unwarnStaffMention} (\`${interaction.user.id}\`)\n` +
                `-# 📌 Motivo\n${unwarnReason}\n` +
                `-# ℹ️ Info\n${unwarnTotal}/3 • Advertência removida`
            );

            return interaction.reply({
                content: `✅ Advertência removida de ${unwarnMemberMention}. Agora ele está com **${unwarnTotal}/3**.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // =========================
        // COMANDO /WARN
        // =========================

        if (interaction.commandName !== 'warn') return;

        if (!canUseWarn(interaction.member)) {
            return interaction.reply({
                content: '❌ Você não possui permissão para usar este comando.',
                flags: MessageFlags.Ephemeral
            });
        }

        const targetUser =
            interaction.options.getUser('membro');

        const reason =
            interaction.options.getString('motivo');

        const member = await interaction.guild.members
            .fetch(targetUser.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Esse membro não está no servidor.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                content: '❌ Você não pode aplicar warn em um bot.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Você não pode aplicar warn em si mesmo.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (member.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ Não é possível aplicar warn no dono do servidor.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (
            member.roles.highest.position >=
                interaction.member.roles.highest.position &&
            interaction.guild.ownerId !== interaction.user.id
        ) {
            return interaction.reply({
                content: '❌ Você não pode aplicar warn em um membro com cargo igual ou superior ao seu.',
                flags: MessageFlags.Ephemeral
            });
        }

        const hasWarn1 =
            member.roles.cache.has(WARN_1_ROLE_ID);

        const hasWarn2 =
            member.roles.cache.has(WARN_2_ROLE_ID);

        const warnNumber = hasWarn2
            ? 3
            : hasWarn1
                ? 2
                : 1;

        const staffMention = `<@${interaction.user.id}>`;
        const memberMention = `<@${member.id}>`;

        // =========================
        // WARN 1 OU WARN 2
        // =========================

        if (warnNumber === 1 || warnNumber === 2) {
            const roleId = warnNumber === 1
                ? WARN_1_ROLE_ID
                : WARN_2_ROLE_ID;

            try {
                await member.roles.add(roleId);
            } catch (error) {
                return interaction.reply({
                    content: `❌ Não consegui adicionar o cargo do ${warnNumber === 1 ? 'primeiro' : 'segundo'} warn. Verifique a hierarquia dos cargos do bot.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                await member.timeout(
                    60 * 60 * 1000,
                    `Warn ${warnNumber}/3: ${reason}`
                );
            } catch (error) {
                console.log(
                    '⚠️ Não foi possível aplicar o mute de 1 hora:',
                    error.message
                );
            }

            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ⚠️ Advertência Aplicada\n\n` +
                        `-# 🛠️ Staff\n${staffMention} (\`${interaction.user.id}\`)\n` +
                        `-# 👤 Membro\n${memberMention} (\`${member.id}\`)\n` +
                        `-# 📌 Motivo\n${reason}\n` +
                        `-# ℹ️ Info\n${warnNumber}/3 • Mute de 1 hora`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            await sendWarnLog(
                interaction.guild,
                logContainer
            );

            await sendWarnDM(
                member,
                `⚠️ Você recebeu uma Advertência na PML.\n\n` +
                `-# 🛠️ Staff\n${staffMention} (\`${interaction.user.id}\`)\n` +
                `-# 📌 Motivo\n${reason}\n` +
                `-# ℹ️ Info\n${warnNumber}/3 • Mute de 1 hora\n\n` +
                `> Se você receber 3 advertências será **BANIDO** do servidor.`
            );

            return interaction.reply({
                content: `✅ Advertência **${warnNumber}/3** aplicada em ${memberMention}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // =========================
        // WARN 3 = BANIMENTO
        // =========================

        if (warnNumber === 3) {
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔨 Banimento aplicado\n\n` +
                        `-# 🛠️ Staff\n${staffMention} (\`${interaction.user.id}\`)\n` +
                        `-# 👤 Membro\n${memberMention} (\`${member.id}\`)\n` +
                        `-# 📌 Motivo\n${reason}\n` +
                        `-# ℹ️ Info\n3/3 • Banido do servidor.`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            const stjdButton = new ButtonBuilder()
                .setLabel('STJD')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Link)
                .setURL(STJD_URL);

            const banDMContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔨 Você foi **BANIDO** da PML\n\n` +
                        `-# 🛠️ Staff\n${staffMention} (\`${interaction.user.id}\`)\n` +
                        `-# 📌 Motivo\n${reason}\n` +
                        `-# ℹ️ Info\n3/3 • Banido do servidor.\n\n` +
                        `> Para ser desbanido entre no STJD da PML clicando no botão abaixo e abra um ticket.`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(stjdButton)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(BOT_FOOTER)
                );

            try {
                await member.send({
                    components: [banDMContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.log(
                    `⚠️ Não foi possível enviar DM para ${member.user.tag}.`
                );
            }

            await sendWarnLog(
                interaction.guild,
                logContainer
            );

            try {
                await member.ban({
                    deleteMessageSeconds: 0,
                    reason: `3/3 Warns: ${reason}`
                });
            } catch (error) {
                console.error(
                    '❌ Erro ao banir membro:',
                    error
                );

                return interaction.reply({
                    content: '❌ Não consegui banir o membro. Verifique a hierarquia do bot.',
                    flags: MessageFlags.Ephemeral
                });
            }

            return interaction.reply({
                content: `🔨 ${memberMention} recebeu o **3º warn** e foi banido da PML.`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error(
            '❌ Erro no comando/interação:',
            error
        );

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }
});

// =========================
// LOGIN
// =========================

if (!TOKEN) {
    console.error('❌ A variável TOKEN não está configurada.');
    process.exit(1);
}

client.login(TOKEN);
