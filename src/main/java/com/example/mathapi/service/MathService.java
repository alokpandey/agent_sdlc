package com.example.mathapi.service;

import org.springframework.stereotype.Service;

@Service
public class MathService {

    /**
     * Validates that the input is a valid number (not NaN or Infinity)
     */
    private void validateInput(double value, String paramName) {
        if (Double.isNaN(value)) {
            throw new IllegalArgumentException(paramName + " cannot be NaN");
        }
        if (Double.isInfinite(value)) {
            throw new IllegalArgumentException(paramName + " cannot be Infinity");
        }
    }

    public double add(double a, double b) {
        validateInput(a, "operand1");
        validateInput(b, "operand2");

        double result = a + b;

        // Check for overflow
        if (Double.isInfinite(result)) {
            throw new ArithmeticException("Addition result overflow");
        }

        return result;
    }

    public double subtract(double a, double b) {
        validateInput(a, "operand1");
        validateInput(b, "operand2");

        double result = a - b;

        // Check for overflow
        if (Double.isInfinite(result)) {
            throw new ArithmeticException("Subtraction result overflow");
        }

        return result;
    }

    public double multiply(double a, double b) {
        validateInput(a, "operand1");
        validateInput(b, "operand2");

        double result = a * b;

        // Check for overflow
        if (Double.isInfinite(result)) {
            throw new ArithmeticException("Multiplication result overflow");
        }

        return result;
    }

    public double divide(double a, double b) {
        validateInput(a, "operand1");
        validateInput(b, "operand2");

        // Check for division by zero
        if (b == 0.0) {
            throw new ArithmeticException("Division by zero is not allowed");
        }

        // Check for very small divisor that might cause precision issues
        if (Math.abs(b) < 1e-10) {
            throw new ArithmeticException("Divisor too small, may cause precision issues");
        }

        double result = a / b;

        // Check for overflow
        if (Double.isInfinite(result)) {
            throw new ArithmeticException("Division result overflow");
        }

        return result;
    }
}

