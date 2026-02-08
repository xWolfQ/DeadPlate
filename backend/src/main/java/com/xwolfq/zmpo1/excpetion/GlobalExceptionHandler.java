package com.xwolfq.zmpo1.excpetion;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.util.Map;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class GlobalExceptionHandler {


    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        Map<String, Object> body = Map.of(
                "error", "FILE_TOO_LARGE",
                "message", "Maksymalny rozmiar pliku został przekroczony."
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(body);
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<Map<String, Object>> handleMultipart(MultipartException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof MaxUploadSizeExceededException) {
            return handleMaxUploadSize((MaxUploadSizeExceededException) cause);
        }
        Map<String, Object> body = Map.of(
                "error", "MULTIPART_ERROR",
                "message", "Błąd przesyłania pliku."
        );
        return ResponseEntity.badRequest().body(body);
    }
}
