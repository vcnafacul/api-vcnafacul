import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
  render,
} from '@react-email/components';
import { Geolocation } from 'src/modules/geo/geo.entity';

interface GeoEmailProps {
  geo: Geolocation;
}

function GeoEmail({ geo }: GeoEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Img
            width={114}
            style={{ margin: '0 auto' }}
            src="https://avatars.githubusercontent.com/u/128550116?s=400&u=b6ec73808233749eb515c2a93f55fe25ed9631d4&v=4"
          />
          <Text style={paragraph}>Olá validador!</Text>
          <Text style={paragraph}>
            Temos um novo cursinho cadastrado no <strong>Você na Facul</strong>.
          </Text>

          <Text style={paragraph}>
            <strong>Nome:</strong> {geo.name}
            <br />
            <strong>Endereço:</strong> {geo.street} - {geo.number} -{' '}
            {geo.complement}, {geo.cep}
            <br />
            {geo.neighborhood}, {geo.city} - {geo.state}
          </Text>

          <Text style={paragraph}>
            <strong>Telefone:</strong> {geo.phone}
            <br />
            <strong>WhatsApp:</strong> {geo.whatsapp}
            <br />
            <strong>Email:</strong> {geo.email}
            <br />
            <strong>Email 2:</strong> {geo.email2}
          </Text>

          <Text style={paragraph}>
            <strong>Categoria:</strong> {geo.category}
            <br />
            <strong>Site:</strong> {geo.site}
            <br />
            <strong>LinkedIn:</strong> {geo.linkedin}
            <br />
            <strong>YouTube:</strong> {geo.youtube}
            <br />
            <strong>Facebook:</strong> {geo.facebook}
            <br />
            <strong>Instagram:</strong> {geo.instagram}
            <br />
            <strong>Twitter:</strong> {geo.twitter}
            <br />
            <strong>TikTok:</strong> {geo.tiktok}
          </Text>

          <Text style={paragraph}>
            <strong>Usuário:</strong> {geo.userFullName}
            <br />
            <strong>Email do Usuário:</strong> {geo.userEmail}
            <br />
            <strong>Telefone do Usuário:</strong> {geo.userPhone}
            <br />
            <strong>Vínculo:</strong> {geo.userConnection}
          </Text>

          <Text style={paragraph}>
            Acesse o <a href="https://vcnafacul.com.br/">link</a> para
            validá-lo.
          </Text>

          <Text style={paragraphTeam}>Equipe Você na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendGeoEmail({ transporter, options }) {
  const emailHtml = await render(
    GeoEmail({
      geo: options.context.geo,
    }),
  );

  const myoptions = {
    ...options,
    html: emailHtml,
  };

  await transporter.sendMail(myoptions);
}

// estilos reutilizados
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
  maxWidth: '500px',
  margin: '20px auto',
};

const paragraphTeam = {
  ...paragraph,
  fontWeight: 'bold',
};
