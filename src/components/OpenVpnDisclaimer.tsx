import React from "react";

const OpenVpnDisclaimer: React.FC = () => {
  return (
    <div style={{
      marginTop: "40px",
      padding: "20px",
      borderTop: "1px solid #d1d5da",

    }}>
      <h3 style={{ color: "#da3633" }}>⚠ Warning</h3>
      <p>
        Using OpenVPN certificate management functions requires a solid understanding of VPN security and certificate issuance. 
        <strong> Do not proceed unless you know what you are doing.</strong>
      </p>

      <h3>🔹 What are OpenVPN Certificates?</h3>
      <p>
        OpenVPN relies on TLS/SSL certificates for authentication. Each client connecting to an OpenVPN server needs a unique certificate 
        issued by a trusted Certificate Authority (CA).
      </p>

      <h3>🔹 How are Certificates Issued?</h3>
      <p>
        OpenVPN certificates are typically issued using a Public Key Infrastructure (PKI). 
        This process includes generating a Certificate Authority (CA), creating client and server keys, and signing them using the CA.
      </p>

      <h3>🔹 What is EasyRSA?</h3>
      <p>
        EasyRSA is a command-line tool that helps manage OpenVPN certificates and keys. It simplifies the process of creating, revoking, 
        and managing certificates for OpenVPN clients and servers.
      </p>

      <h3>🔹 How Certificate Revocation Works</h3>
      <p>
        If a certificate is compromised, it must be revoked. OpenVPN maintains a Certificate Revocation List (CRL), which prevents 
        revoked certificates from being used to connect to the VPN.
      </p>

      <p>
        Learn more: <a href="https://openvpn.net/community-resources/how-to/" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>OpenVPN Documentation</a>
      </p>
    </div>
  );
};

export default OpenVpnDisclaimer;
