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

/**
 * O convite para ser colaborador de um cursinho, já com a função (card 03 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Dois textos, um link.** Quem já tem conta aceita; quem não tem é
 * convidado a se cadastrar. O link é o mesmo — a página decide o caminho
 * (cards 04 e 05).
 */
export interface ConviteColaboradorProps {
  /** Ausente para quem ainda não tem conta. */
  nome: string | null;
  nomeGestor: string;
  nomeCursinho: string;
  funcao: string;
  url: string;
  temConta: boolean;
  /** "01/10" */
  validoAte: string;
}

export function ConviteColaborador({
  nome,
  nomeGestor,
  nomeCursinho,
  funcao,
  url,
  temConta,
  validoAte,
}: ConviteColaboradorProps) {
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
          <Text style={paragraph}>{nome ? `Olá ${nome}!` : 'Olá!'}</Text>
          <Text style={paragraph}>
            {nomeGestor} convidou você para fazer parte do {nomeCursinho} como{' '}
            <strong>{funcao}</strong>.
          </Text>
          <Text style={paragraph}>
            {temConta
              ? 'Clique no botão abaixo para aceitar o convite.'
              : 'Para aceitar, crie sua conta na plataforma Você na Facul pelo botão abaixo — ao concluir o cadastro, você já entra como colaborador.'}
          </Text>
          <Button style={button} href={url}>
            {temConta ? 'Aceitar convite' : 'Criar conta e aceitar'}
          </Button>
          <Text style={paragraph}>
            O convite vale até {validoAte}. Se você não esperava por ele,
            desconsidere este email.
          </Text>
          <Text style={paragraphTeam}>Equipe Você na Facul</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function sendEmailConviteColaborador({
  transporter,
  options,
}: {
  transporter: { sendMail: (o: unknown) => Promise<unknown> };
  options: { context: ConviteColaboradorProps } & Record<string, unknown>;
}) {
  const html = await render(ConviteColaborador(options.context));
  await transporter.sendMail({ ...options, html });
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
