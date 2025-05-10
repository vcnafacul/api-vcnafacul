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

interface Props {
  declaredInterestUrl: string;
  prepCourseName: string;
  limitDate: string;
}

function Email({ declaredInterestUrl, prepCourseName, limitDate }: Props) {
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
          <Text style={{ ...paragraph, textAlign: 'center' }}>Olá!</Text>
          <Text style={{ ...paragraph, textAlign: 'center' }}>
            Estamos felizes em anunciar que você foi selecionado para fazer
            parte do {prepCourseName}. Clique no botão abaixo para declarar
            interesse na vaga:
          </Text>
          <Button style={button} href={declaredInterestUrl}>
            Declarar Interesse
          </Button>
          <Text style={{ ...paragraph, textAlign: 'center' }}>
            Caso você já tenha declarado, desconsidere essa mensagem.
          </Text>
          <Text style={{ ...paragraph, textAlign: 'center' }}>
            Atenção, você deve declarar o interesse até o dia {limitDate}.
          </Text>
          <Text style={{ ...paragraphTeam, textAlign: 'end' }}>
            Equipe Você na Facul
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEmailDeclaredInterestBulk({ transporter, options }) {
  const emailHtml = await render(
    Email({
      declaredInterestUrl: options.context.declaredInterestUrl,
      prepCourseName: options.context.prepCourseName,
      limitDate: options.context.date,
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
