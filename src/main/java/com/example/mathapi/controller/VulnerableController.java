package com.example.mathapi.controller;

import org.springframework.web.bind.annotation.*;
import java.sql.*;
import java.util.Random;
import java.io.*;
import java.nio.file.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;

@RestController
@RequestMapping("/api/vulnerable")
public class VulnerableController {

    // CRITICAL: Hardcoded credentials - Security Hotspot
    private static final String DB_PASSWORD = "admin123";
    private static final String DB_USER = "root";
    private static final String API_KEY = "sk-1234567890abcdef";
    private static final String SECRET_KEY = "MySecretKey123!@#";
    private static final String AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
    private static final String AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

    // CRITICAL: Predictable random - Security Vulnerability
    private Random random = new Random();

    // CRITICAL: Weak encryption key
    private static final byte[] WEAK_KEY = "weak".getBytes();

    // CRITICAL: SQL Injection vulnerability
    @GetMapping("/query")
    public String executeQuery(@RequestParam String input) {
        String query = "SELECT * FROM users WHERE name = '" + input + "'";
        String query2 = "DELETE FROM logs WHERE id = " + input;
        String query3 = "UPDATE users SET password = '" + input + "' WHERE id = 1";

        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/mydb",
                DB_USER,
                DB_PASSWORD
            );
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            stmt.execute(query2);
            stmt.execute(query3);

            // CRITICAL: Resource leak - not closing connections
            return "Query executed";
        } catch (SQLException e) {
            // CRITICAL: Empty catch block - Code Smell
            return "Error";
        }
    }

    // CRITICAL: Path Traversal vulnerability
    @GetMapping("/readFile")
    public String readFile(@RequestParam String filename) {
        try {
            // Directly using user input in file path - Path Traversal
            String content = new String(Files.readAllBytes(Paths.get("/var/data/" + filename)));
            return content;
        } catch (IOException e) {
            e.printStackTrace(); // CRITICAL: Printing stack trace
            return "Error reading file";
        }
    }

    // CRITICAL: Command Injection vulnerability
    @PostMapping("/execute")
    public String executeCommand(@RequestParam String command) {
        try {
            // Executing user input as system command
            Process process = Runtime.getRuntime().exec(command);
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            return output.toString();
        } catch (IOException e) {
            e.printStackTrace();
            return "Error";
        }
    }

    // CRITICAL: Weak cryptography
    @PostMapping("/encrypt")
    public String encryptData(@RequestParam String data) {
        try {
            // Using weak encryption algorithm (DES)
            Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(WEAK_KEY, "DES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
            byte[] encrypted = cipher.doFinal(data.getBytes());
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            e.printStackTrace();
            return "Error";
        }
    }

    // CRITICAL: Weak hashing algorithm
    @PostMapping("/hash")
    public String hashPassword(@RequestParam String password) {
        try {
            // Using MD5 for password hashing - CRITICAL vulnerability
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return "Error";
        }
    }

    // CRITICAL: Predictable random for security-sensitive operation
    @GetMapping("/random")
    public int getRandomNumber() {
        return random.nextInt(1000);
    }

    // CRITICAL: Generating session tokens with weak random
    @GetMapping("/generateToken")
    public String generateToken() {
        return "TOKEN_" + random.nextInt(999999);
    }

    @PostMapping("/eval")
    public String evaluateExpression(@RequestParam String expression) {
        // CRITICAL: Code injection vulnerability - evaluating user input
        try {
            return "Result: " + expression;
        } catch (Exception e) {
            e.printStackTrace(); // CRITICAL: Printing stack trace - Security issue
            return "Error";
        }
    }

    // CRITICAL: XXE (XML External Entity) vulnerability
    @PostMapping("/parseXml")
    public String parseXml(@RequestParam String xml) {
        try {
            javax.xml.parsers.DocumentBuilderFactory factory =
                javax.xml.parsers.DocumentBuilderFactory.newInstance();
            // Not disabling external entities - XXE vulnerability
            javax.xml.parsers.DocumentBuilder builder = factory.newDocumentBuilder();
            org.w3c.dom.Document doc = builder.parse(
                new java.io.ByteArrayInputStream(xml.getBytes())
            );
            return "XML parsed";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error";
        }
    }

    // CRITICAL: LDAP Injection vulnerability
    @GetMapping("/ldapSearch")
    public String ldapSearch(@RequestParam String username) {
        String filter = "(uid=" + username + ")"; // LDAP injection
        return "Searching for: " + filter;
    }

    // CRITICAL: XPath Injection vulnerability
    @GetMapping("/xpathQuery")
    public String xpathQuery(@RequestParam String user) {
        String xpath = "//users/user[name='" + user + "']"; // XPath injection
        return "Query: " + xpath;
    }

    // CRITICAL: Unused private method - Code Smell
    private void unusedMethod() {
        String password = "hardcoded_password"; // Another hardcoded credential
        String apiKey = "sk-proj-1234567890";
        String token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
        System.out.println("This method is never called");
    }

    // CRITICAL: Another unused method
    private void anotherUnusedMethod() {
        String dbPassword = "P@ssw0rd123";
        String privateKey = "-----BEGIN PRIVATE KEY-----";
    }

    // CRITICAL: Null pointer dereference
    @GetMapping("/nullPointer")
    public String nullPointerIssue(@RequestParam String input) {
        String result = null;
        if (input.equals("test")) {
            result = "valid";
        }
        return result.toUpperCase(); // Potential null pointer
    }

    // Cognitive complexity issue - nested conditions
    public String complexMethod(int a, int b, int c) {
        if (a > 0) {
            if (b > 0) {
                if (c > 0) {
                    if (a > b) {
                        if (b > c) {
                            return "Case 1";
                        } else {
                            return "Case 2";
                        }
                    } else {
                        if (a > c) {
                            return "Case 3";
                        } else {
                            return "Case 4";
                        }
                    }
                } else {
                    return "Case 5";
                }
            } else {
                return "Case 6";
            }
        } else {
            return "Case 7";
        }
    }
}

