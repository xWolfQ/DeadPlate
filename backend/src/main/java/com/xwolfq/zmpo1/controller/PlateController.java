package com.xwolfq.zmpo1.controller;

import com.xwolfq.zmpo1.PlateUploadResponse;
import com.xwolfq.zmpo1.service.PlateStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/plates")
public class PlateController {

    private final Path workDir;
    private final String pythonCmd;
    private final String inputImageName;
    private final long timeoutSeconds;

    public PlateController(
            @Value("${ocr.work-dir}") String workDir,
            @Value("${ocr.python}") String pythonCmd,
            @Value("${ocr.input-image}") String inputImageName,
            @Value("${ocr.timeout}") long timeoutSeconds
    ) {
        this.workDir = Paths.get(workDir);
        this.pythonCmd = pythonCmd;
        this.inputImageName = inputImageName;
        this.timeoutSeconds = timeoutSeconds;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAndRunScript(
            @RequestParam("image") MultipartFile image
    ) throws Exception {

        // 1️⃣ upewnij się, że katalog roboczy istnieje
        Files.createDirectories(workDir);

        Path tempImagePath = workDir.resolve(inputImageName);

        try {
            // 2️⃣ zapisz obraz w katalogu skryptu
            Files.copy(
                    image.getInputStream(),
                    tempImagePath,
                    StandardCopyOption.REPLACE_EXISTING
            );

            // 3️⃣ uruchom python (bez argumentów)
            ProcessBuilder pb = new ProcessBuilder(
                    pythonCmd,
                    "deadplate.py"
            );
            pb.directory(workDir.toFile());   // KLUCZOWE
            pb.redirectErrorStream(true);

            Process process = pb.start();

            // 4️⃣ odczytaj stdout
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            );

            StringBuilder output = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            boolean finished1 = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished1) {
                process.destroyForcibly();
                throw new RuntimeException("Python timeout");
            }

            String result = output.toString();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("OCR timeout");
            }

            return ResponseEntity.ok(
                    Map.of(
                            "plateText", result
                    )
            );

        } finally {
            // 5️⃣ zawsze usuń plik tymczasowy
            Files.deleteIfExists(tempImagePath);
        }
    }
}


