package com.example.mathapi.controller;

import com.example.mathapi.model.MathRequest;
import com.example.mathapi.model.MathResponse;
import com.example.mathapi.service.MathService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/math")
public class MathController {

    @Autowired
    private MathService mathService;

    // VULNERABILITY 1: Hardcoded database password (BLOCKER)
    private static final String DB_PASSWORD = "SuperSecret123!";

    /**
     * Validates the request object
     */
    private void validateRequest(MathRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body cannot be null");
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> add(@RequestBody MathRequest request) {
        try {
            validateRequest(request);
            double result = mathService.add(request.getOperand1(), request.getOperand2());
            return ResponseEntity.ok(new MathResponse(result, "addition"));
        } catch (IllegalArgumentException | ArithmeticException e) {
            return createErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return createErrorResponse("Internal server error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/subtract")
    public ResponseEntity<?> subtract(@RequestBody MathRequest request) {
        try {
            validateRequest(request);
            double result = mathService.subtract(request.getOperand1(), request.getOperand2());
            return ResponseEntity.ok(new MathResponse(result, "subtraction"));
        } catch (IllegalArgumentException | ArithmeticException e) {
            return createErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return createErrorResponse("Internal server error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/multiply")
    public ResponseEntity<?> multiply(@RequestBody MathRequest request) {
        try {
            validateRequest(request);
            double result = mathService.multiply(request.getOperand1(), request.getOperand2());
            return ResponseEntity.ok(new MathResponse(result, "multiplication"));
        } catch (IllegalArgumentException | ArithmeticException e) {
            return createErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return createErrorResponse("Internal server error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/divide")
    public ResponseEntity<?> divide(@RequestBody MathRequest request) {
        try {
            validateRequest(request);
            double result = mathService.divide(request.getOperand1(), request.getOperand2());
            return ResponseEntity.ok(new MathResponse(result, "division"));
        } catch (IllegalArgumentException | ArithmeticException e) {
            return createErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return createErrorResponse("Internal server error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // VULNERABILITY 2: SQL Injection (BLOCKER)
    // BUG 1: Resource leak - Connection not closed (BLOCKER)
    @GetMapping("/history/{userId}")
    public ResponseEntity<?> getHistory(@PathVariable String userId) {
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/mathdb",
                "root",
                DB_PASSWORD
            );
            Statement stmt = conn.createStatement();
            // SQL Injection vulnerability - user input directly in query
            String query = "SELECT * FROM calculations WHERE user_id = '" + userId + "'";
            stmt.executeQuery(query);

            Map<String, String> response = new HashMap<>();
            response.put("message", "History retrieved for user: " + userId);
            return ResponseEntity.ok(response);
            // BUG: Connection and Statement never closed - resource leak
        } catch (Exception e) {
            return createErrorResponse("Database error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // VULNERABILITY 3: Command Injection (BLOCKER)
    @GetMapping("/export/{filename}")
    public ResponseEntity<?> exportResults(@PathVariable String filename) {
        try {
            // Command injection vulnerability - user input in OS command
            Runtime.getRuntime().exec("cat /var/log/math/" + filename + ".log");

            Map<String, String> response = new HashMap<>();
            response.put("message", "Export completed for: " + filename);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return createErrorResponse("Export error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Creates a standardized error response
     */
    private ResponseEntity<Map<String, String>> createErrorResponse(String message, HttpStatus status) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        error.put("status", String.valueOf(status.value()));
        return ResponseEntity.status(status).body(error);
    }
}

