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
  students: { position: number; name: string }[];
  prepCourseName: string;
}

function Email({ students, prepCourseName }: Props) {
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
          <Text style={paragraph}>
            Estamos enviando a atualização da lista de espera para o{' '}
            {prepCourseName}. Abaixo, você encontrará sua posição atualizada na
            lista.
          </Text>
          <table style={container}>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome Completo</th>
              </tr>
            </thead>
            {students.map((s) => (
              <tr key={s.position}>
                <td
                  style={{
                    textAlign: 'center',
                  }}
                >
                  {s.position}
                </td>
                <td
                  style={{
                    textAlign: 'center',
                  }}
                >
                  {s.name}
                </td>
              </tr>
            ))}
          </table>
          <Text style={paragraph}>
            Continuaremos acompanhando a evolução das inscrições e informaremos
            qualquer mudança em sua posição.
          </Text>
          <Text style={paragraphTeam}>Equipe Você na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEmailWaitingList({ transporter, options }) {
  const emailHtml = await render(
    Email({
      students: options.context.students,
      prepCourseName: options.context.prepCourseName,
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
