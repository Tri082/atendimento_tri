import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type Props = {
  userName: string;
  appName: string;
  appUrl: string;
};

export function WelcomeEmail({ userName, appName, appUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Bem-vindo ao {appName}!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Bem-vindo, {userName}!</Heading>
          <Text style={paragraph}>
            Sua conta foi criada com sucesso no <strong>{appName}</strong>.
          </Text>
          <Text style={paragraph}>
            Para começar, acesse{" "}
            <a href={appUrl} style={link}>
              {appUrl}
            </a>{" "}
            e crie seu primeiro workspace.
          </Text>
          <Text style={footer}>Se você não criou essa conta, ignore este email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#0a0a0a", color: "#f5f5f5", fontFamily: "sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "32px" };
const heading = { color: "#52d12f", fontSize: "24px", fontWeight: 600 };
const paragraph = { fontSize: "16px", lineHeight: "24px", color: "#d4d4d4" };
const link = { color: "#52d12f" };
const footer = { fontSize: "12px", color: "#737373", marginTop: "32px" };

export default WelcomeEmail;
