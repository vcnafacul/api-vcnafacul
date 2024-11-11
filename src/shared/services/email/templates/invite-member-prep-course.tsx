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

interface InviteMemberPrepCourseProps {
  name: string;
  nameManager: string;
  prepCourseName: string;
  acceptInviteUrl: string;
}

function InviteMemberPrepCourse({
  name,
  nameManager,
  prepCourseName,
  acceptInviteUrl,
}: InviteMemberPrepCourseProps) {
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
          <Text style={paragraph}>Olá {name}!</Text>
          <Text style={paragraph}>
            Você foi convidado por {nameManager} para participar do{' '}
            {prepCourseName}. Clique no link abaixo para aceitar o convite:
          </Text>
          <Button style={button} href={acceptInviteUrl}>
            Aceitar convite
          </Button>
          <Text style={paragraph}>
            Caso você não tenha feito essa solicitação, desconsidere esse email
          </Text>
          <Text style={paragraphTeam}>Equipe vCnaFacul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEmailInviteMember({ transporter, options }) {
  const emailHtml = await render(
    InviteMemberPrepCourse({
      acceptInviteUrl: options.context.acceptInviteUrl,
      name: options.context.name,
      nameManager: options.context.nameManager,
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
  borderRadius: '7px',
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
