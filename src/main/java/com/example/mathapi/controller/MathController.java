package com.example.mathapi.controller;

import com.example.mathapi.model.MathRequest;
import com.example.mathapi.model.MathResponse;
import com.example.mathapi.service.MathService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/math")
public class MathController {

    private static final String INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error: ";
    
    private final MathService mathService;
    private final DataSource dataSource;

    @Autowired
    public MathController(MathService mathService, DataSource dataSource) {
        this.mathService = mathService;
        this.dataSource = dataSource;
    }

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
            return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
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
            return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
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
            return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
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
            return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<?> getHistory(@PathVariable String userId) {
        String query = "SELECT * FROM calculations WHERE user_id = ?";
        Map<String, String> response = new HashMap<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(query)) {
            stmt.setString(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                // Process result set if needed
            }
            response.put("message", "History retrieved for user: " + userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return createErrorResponse("Database error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/export/{filename}")
    public ResponseEntity<?> exportResults(@PathVariable String filename) {
        if (!isValidFilename(filename)) {
            return createErrorResponse("Invalid filename", HttpStatus.BAD_REQUEST);
        }
        Map<String, String> response = new HashMap<>();
        response.put("message", "Export completed for: " + filename);
        return ResponseEntity.ok(response);
    }

    private boolean isValidFilename(String filename) {
        return filename.matches("[a-zA-Z0-9_-]+");
    }

    private ResponseEntity<Map<String, String>> createErrorResponse(String message, HttpStatus status) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        error.put("status", String.valueOf(status.value()));
        return ResponseEntity.status(status).body(error);
    }
}