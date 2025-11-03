package com.example.mathapi.controller;

import org.springframework.web.bind.annotation.*;
import java.sql.*;
import java.util.Random;

@RestController
@RequestMapping("/api/vulnerable")
public class VulnerableController {

    // Hardcoded credentials - Security Hotspot
    private static final String DB_PASSWORD = "admin123";
    private static final String DB_USER = "root";
    
    // Predictable random - Security Vulnerability
    private Random random = new Random();

    @GetMapping("/query")
    public String executeQuery(@RequestParam String input) {
        // SQL Injection vulnerability
        String query = "SELECT * FROM users WHERE name = '" + input + "'";
        
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/mydb", 
                DB_USER, 
                DB_PASSWORD
            );
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            
            // Resource leak - not closing connections
            return "Query executed";
        } catch (SQLException e) {
            // Empty catch block - Code Smell
            return "Error";
        }
    }

    @GetMapping("/random")
    public int getRandomNumber() {
        // Using predictable random for security-sensitive operation
        return random.nextInt(1000);
    }

    @PostMapping("/eval")
    public String evaluateExpression(@RequestParam String expression) {
        // Code injection vulnerability - evaluating user input
        try {
            // This is intentionally vulnerable
            return "Result: " + expression;
        } catch (Exception e) {
            e.printStackTrace(); // Printing stack trace - Security issue
            return "Error";
        }
    }

    // Unused private method - Code Smell
    private void unusedMethod() {
        String password = "hardcoded_password"; // Another hardcoded credential
        System.out.println("This method is never called");
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

