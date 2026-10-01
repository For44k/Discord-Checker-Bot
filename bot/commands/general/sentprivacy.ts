import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits,
    Message
} from 'discord.js';

const EMBEDV2_COLOR = 0xBBEDFF;

export default {
    name: 'sentprivacy',
    description: 'Send the official Terms of Service and Privacy Policy.',
    aliases: ['sendprivacy', 'privacy', 'tos', 'privacypolicy'],
    usage: '+sentprivacy',

    async execute(message: Message | any, args: string[]) {
        const sep = () => new SeparatorBuilder();

        const container1 = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# __Terms of Service__`
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### **Service Description**\n` +
                    `- Multi-purpose bot providing clan management, relationships, verification, moderation, economy, and more  ⁘\n\n` +
                    `### **Eligibility**\n` +
                    `- You must be at least 13 years of age  ⁘\n\n` +
                    `### **User Responsibilities**\n` +
                    `- Do not misuse the bot for illegal activities, harassment, or exploitation  ⁘\n\n` +
                    `### **Virtual Economy**\n` +
                    `- RVP, XP, levels have no real-world value and are non-transferable  ⁘\n\n` +
                    `### **Limitation of Liability**\n` +
                    `- Provided "as is" without warranties  ⁘\n\n` +
                    `### **Termination**\n` +
                    `- We reserve the right to terminate access for violations  ⁘`
                )
            )
            .addSeparatorComponents(sep());

        const container2 = new ContainerBuilder()
            .setAccentColor(EMBEDV2_COLOR)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# __Privacy Policy__`
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### **Information Collection**\n` +
                    `- User IDs, guild IDs, command usage data, voice activity  ⁘\n\n` +
                    `### **Data Usage**\n` +
                    `- Used solely for providing and improving bot features  ⁘\n\n` +
                    `### **Data Security**\n` +
                    `- Encryption, access controls, and security audits  ⁘\n\n` +
                    `### **Data Sharing**\n` +
                    `- We do not share user data with third parties unless required by law  ⁘\n\n` +
                    `### **User Rights**\n` +
                    `- You have the right to access, correct, or delete your data  ⁘\n\n` +
                    `### **Legal Compliance**\n` +
                    `- Complies with GDPR, CCPA, and other data protection laws  ⁘`
                )
            )
            .addSeparatorComponents(sep());

        return message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container1, container2]
        });
    }
};
