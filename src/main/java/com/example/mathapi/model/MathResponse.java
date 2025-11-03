package com.example.mathapi.model;

public class MathResponse {
    private double result;
    private String operation;

    public MathResponse() {
    }

    public MathResponse(double result, String operation) {
        this.result = result;
        this.operation = operation;
    }

    public double getResult() {
        return result;
    }

    public void setResult(double result) {
        this.result = result;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }
}

