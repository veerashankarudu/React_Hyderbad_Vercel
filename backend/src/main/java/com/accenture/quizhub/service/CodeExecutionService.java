package com.accenture.quizhub.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

@Service
@Slf4j
public class CodeExecutionService {

    private static final long TIMEOUT_MS = 5000;
    private static final long MAX_OUTPUT_LENGTH = 10000;

    public record TestCaseInput(String input, String expectedOutput, boolean hidden) {}
    public record TestCaseResult(int testNum, boolean passed, String expected, String actual, String error) {}
    public record ExecutionResult(boolean allPassed, int passed, int total, List<TestCaseResult> results) {}

    public ExecutionResult execute(String language, String code, List<TestCaseInput> testCases) {
        List<TestCaseResult> results = new ArrayList<>();
        int passedCount = 0;

        for (int i = 0; i < testCases.size(); i++) {
            TestCaseInput tc = testCases.get(i);
            TestCaseResult result = runSingle(language, code, tc, i + 1);
            results.add(result);
            if (result.passed()) passedCount++;
        }

        return new ExecutionResult(passedCount == testCases.size(), passedCount, testCases.size(), results);
    }

    private TestCaseResult runSingle(String language, String code, TestCaseInput tc, int testNum) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("quizhub-code-");
            String output;

            switch (language.toLowerCase()) {
                case "java":
                    output = runJava(tempDir, code, tc.input());
                    break;
                case "python":
                    output = runPython(tempDir, code, tc.input());
                    break;
                case "javascript":
                    output = runJavaScript(tempDir, code, tc.input());
                    break;
                default:
                    return new TestCaseResult(testNum, false, tc.expectedOutput(), "", "Unsupported language: " + language);
            }

            String trimmedOutput = output.trim();
            String trimmedExpected = tc.expectedOutput().trim();
            boolean passed = trimmedOutput.equals(trimmedExpected);
            return new TestCaseResult(testNum, passed, trimmedExpected, trimmedOutput, null);

        } catch (TimeoutException e) {
            return new TestCaseResult(testNum, false, tc.expectedOutput(), "", "Time Limit Exceeded (5s)");
        } catch (Exception e) {
            return new TestCaseResult(testNum, false, tc.expectedOutput(), "", e.getMessage());
        } finally {
            if (tempDir != null) {
                deleteDir(tempDir);
            }
        }
    }

    private String runJava(Path dir, String code, String input) throws Exception {
        // Extract class name from code
        String className = "Solution";
        int classIdx = code.indexOf("class ");
        if (classIdx >= 0) {
            String rest = code.substring(classIdx + 6).trim();
            className = rest.split("[^a-zA-Z0-9_]")[0];
        }

        Path sourceFile = dir.resolve(className + ".java");
        Files.writeString(sourceFile, code);

        // Compile
        ProcessResult compileResult = runProcess(dir, List.of("javac", sourceFile.toString()), "", 10000);
        if (compileResult.exitCode != 0) {
            throw new RuntimeException("Compilation Error: " + compileResult.output);
        }

        // Run
        return runProcess(dir, List.of("java", "-cp", dir.toString(), className), input, TIMEOUT_MS).output;
    }

    private String runPython(Path dir, String code, String input) throws Exception {
        Path script = dir.resolve("solution.py");
        Files.writeString(script, code);
        return runProcess(dir, List.of("python3", script.toString()), input, TIMEOUT_MS).output;
    }

    private String runJavaScript(Path dir, String code, String input) throws Exception {
        Path script = dir.resolve("solution.js");
        Files.writeString(script, code);
        return runProcess(dir, List.of("node", script.toString()), input, TIMEOUT_MS).output;
    }

    private record ProcessResult(int exitCode, String output) {}

    private ProcessResult runProcess(Path dir, List<String> command, String input, long timeoutMs) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command)
                .directory(dir.toFile())
                .redirectErrorStream(true);

        // Security: restrict environment
        pb.environment().clear();
        pb.environment().put("PATH", "/usr/bin:/usr/local/bin:/opt/homebrew/bin");
        pb.environment().put("HOME", dir.toString());

        Process process = pb.start();

        // Write input
        if (input != null && !input.isEmpty()) {
            try (OutputStream os = process.getOutputStream()) {
                os.write(input.getBytes());
                os.flush();
            }
        } else {
            process.getOutputStream().close();
        }

        // Read output with limit
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<String> outputFuture = executor.submit(() -> {
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                int ch;
                while ((ch = reader.read()) != -1 && sb.length() < MAX_OUTPUT_LENGTH) {
                    sb.append((char) ch);
                }
            }
            return sb.toString();
        });

        boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            executor.shutdownNow();
            throw new TimeoutException("Execution timed out");
        }

        String output = outputFuture.get(1, TimeUnit.SECONDS);
        executor.shutdown();

        if (process.exitValue() != 0 && output.isBlank()) {
            throw new RuntimeException("Runtime Error (exit code " + process.exitValue() + ")");
        }

        return new ProcessResult(process.exitValue(), output);
    }

    private void deleteDir(Path dir) {
        try {
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }
}
