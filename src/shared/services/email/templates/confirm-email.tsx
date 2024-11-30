import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  render,
  Text,
} from '@react-email/components';

function Email(props) {
  const { confirmEmailUrl, name } = props;

  return (
    <Html>
      <Body style={main}>
        <Head />
        <Container style={container}>
          <Img
            width={114}
            style={{ margin: '0 auto' }}
            src="https://avatars.githubusercontent.com/u/128550116?s=400&u=b6ec73808233749eb515c2a93f55fe25ed9631d4&v=4"
          />
          <Text style={paragraph}>
            Olá {name}!, Bem-vindo(a) ao Você na Facul,
          </Text>
          <Text style={paragraph}>
            Obrigado por se cadastrar em nossa plataforma. Para confirmar seu
            email, clique no link abaixo:
          </Text>
          <Button style={button} href={confirmEmailUrl}>
            Confirmar Email
          </Button>
          <Text style={paragraphTeam}>Equipe Você na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEmailConfirmEmail({ transporter, options }) {
  const emailHtml = await render(
    Email({
      confirmEmailUrl: options.context.confirmEmailUrl,
      name: options.context.name,
    }),
  );

  const myoptions = {
    ...options,
    html: emailHtml,
  };

  await transporter.sendMail(myoptions);
}

const main = {
  backgroundColor: '#efeef1',
  width: '100%',
  padding: '20px 0',
  margin: '20px auto',
};

const container = {
  maxWidth: '580px',
  margin: '30px auto',
  backgroundColor: '#ffffff',
  padding: '20px',
};

const paragraph = {
  lineHeight: 1.5,
  fontSize: 14,
  maxWidth: '400px',
  margin: '20px auto',
};

const paragraphTeam = {
  ...paragraph,
  fontWeight: 'bold',
};

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: "'Open Sans', 'Helvetica Neue', Arial",
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '210px',
  padding: '14px 7px',
  margin: '20px auto',
};
