import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  inviterName: string;
  orgName: string;
  acceptUrl: string;
};

export function InvitationEmail({ inviterName, orgName, acceptUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} te convidou para {orgName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Você foi convidado!</Heading>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> te convidou para fazer parte de{" "}
            <strong>{orgName}</strong>.
          </Text>
          <Section style={btnSection}>
            <Button href={acceptUrl} style={button}>
              Aceitar convite
            </Button>
          </Section>
          <Text style={paragraph}>Ou copie e cole esse endereço no navegador:</Text>
          <Text style={code}>
            <Link href={acceptUrl}>{acceptUrl}</Link>
          </Text>
          <Text style={footer}>
            Esse link expira em 7 dias. Se você não esperava esse convite, pode ignorar este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#0a0a0a", color: "#f5f5f5", fontFamily: "sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "32px" };
const heading = {
  color: "#52d12f",
  fontSize: "24px",
  fontWeight: 600,
  marginBottom: "16px",
};
const paragraph = { fontSize: "16px", lineHeight: "24px", color: "#d4d4d4" };
const btnSection = { textAlign: "center" as const, margin: "32px 0" };
const button = {
  backgroundColor: "#52d12f",
  color: "#0a0a0a",
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: 600,
  display: "inline-block",
};
const code = {
  backgroundColor: "#1a1a1a",
  padding: "8px 12px",
  borderRadius: "4px",
  fontSize: "14px",
  wordBreak: "break-all" as const,
};
const footer = { fontSize: "12px", color: "#737373", marginTop: "32px" };

export default InvitationEmail;
