import Mailgen from "mailgen"

export function mailTemplate(name: string, link: string) {
    const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            // Appears in header & footer of e-mails
            name: 'Khmer Lesson',
            link: 'https://mailgen.js/',
            copyright: `© ${new Date().getFullYear()} KhmerLesson. All rights reserved.`
        }
    });
    let email = {
        body: {
            name: name,
            intro: 'You have received this email because a password reset request for your account was received.',
            action: {
                instructions: 'Click the button below to reset your password:',
                button: {
                    color: '#22BC66', // Optional action button color
                    text: 'Reset your password',
                    link: link
                }
            },
            outro: 'If you did not request a password reset, no further action is required on your part.'
        }
    };
    const emailBody = mailGenerator.generate(email)
    return emailBody
}