package com.example.mathapi.controller;

import com.example.mathapi.model.MathRequest;
import com.example.mathapi.model.MathResponse;
import com.example.mathapi.service.MathService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/math")
public class MathController {

    @Autowired
    private MathService mathService;

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

