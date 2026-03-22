import {
  Body,
  Container,
  Head,
  Html,
  Img,
  render,
  Text,
  Button,
} from '@react-email/components';

interface EssayReviewEmailProps {
  studentName: string;
  reviewerName: string;
  themeTitle: string;
  totalScore: number;
  comp1Score: number;
  comp2Score: number;
  comp3Score: number;
  comp4Score: number;
  comp5Score: number;
  reviewUrl: string;
}

function Email(props: EssayReviewEmailProps) {
  const {
    studentName,
    reviewerName,
    themeTitle,
    totalScore,
    comp1Score,
    comp2Score,
    comp3Score,
    comp4Score,
    comp5Score,
    reviewUrl,
  } = props;

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
            Ola {studentName}!
          </Text>
          <Text style={paragraph}>
            Sua redacao sobre o tema <strong>"{themeTitle}"</strong> foi revisada
            por {reviewerName}.
          </Text>
          <Text style={paragraph}>
            <strong>Nota total: {totalScore}/1000</strong>
          </Text>
          <Text style={paragraphSmall}>
            Competencia 1: {comp1Score}/200 | Competencia 2: {comp2Score}/200 |
            Competencia 3: {comp3Score}/200 | Competencia 4: {comp4Score}/200 |
            Competencia 5: {comp5Score}/200
          </Text>
          <Button style={button} href={reviewUrl}>
            Ver revisao completa
          </Button>
          <Text style={paragraphTeam}>Equipe Voce na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEssayReviewNotification({ transporter, options }: any) {
  const emailHtml = await render(Email(options.context));
  await transporter.sendMail({ ...options, html: emailHtml });
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

const paragraphSmall = {
  ...paragraph,
  fontSize: 12,
  color: '#666',
};

const paragraphTeam = {
  ...paragraph,
  fontWeight: 'bold' as const,
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
