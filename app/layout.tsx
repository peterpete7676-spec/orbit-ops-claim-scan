export const metadata = {
  title: "Claim Rejection Risk Scan",
  description: "Upload → Score → Summary PDF"
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#0B1226", color: "#F8FAFC", margin: 0, fontFamily: "Inter, system-ui, Arial" }}>
        {children}
      </body>
    </html>
  );
}
