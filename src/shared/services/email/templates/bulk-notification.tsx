import {
  Body,
  Container,
  Head,
  Html,
  Img,
  render,
  Text,
} from '@react-email/components';

interface Props {
  message: string;
}

function Email({ message }: Props) {
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
          <Text style={paragraph}>Prezado(a) estudante,</Text>
          <Text style={{ ...paragraph, whiteSpace: 'pre-line' }}>
            {message}
          </Text>
          <Text style={paragraphTeam}>Equipe Você na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendBulkNotification({ transporter, options }) {
  const emailHtml = await render(
    Email({
      message: options.context.message,
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
  maxWidth: '100%',
  margin: '20px 0',
};

const paragraphTeam = {
  ...paragraph,
  fontWeight: 'bold',
  marginTop: '30px',
};
