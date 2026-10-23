"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACE_UNIQUENESS_MIN_DISTANCE = exports.FACE_MATCH_MAX_DISTANCE = void 0;
exports.parseFaceDescriptor = parseFaceDescriptor;
exports.calculateEuclideanDistance = calculateEuclideanDistance;
exports.calculateSimilarityPercent = calculateSimilarityPercent;
exports.FACE_MATCH_MAX_DISTANCE = 0.50;
exports.FACE_UNIQUENESS_MIN_DISTANCE = 0.48;
function parseFaceDescriptor(raw) {
    if (!raw) {
        throw new Error('Data biometrik wajah (face descriptor) tidak boleh kosong.');
    }
    let vector;
    if (typeof raw === 'string') {
        try {
            vector = JSON.parse(raw);
        }
        catch {
            throw new Error('Format JSON face descriptor tidak valid.');
        }
    }
    else if (Array.isArray(raw)) {
        vector = raw;
    }
    else {
        throw new Error('Tipe data face descriptor harus berupa array float 128 dimensi.');
    }
    if (!Array.isArray(vector) || vector.length !== 128) {
        throw new Error(`Face descriptor harus berupa vektor 128 dimensi (terdeteksi: ${vector?.length || 0} dimensi).`);
    }
    for (let i = 0; i < vector.length; i++) {
        if (typeof vector[i] !== 'number' || isNaN(vector[i])) {
            throw new Error('Nilai vektor face descriptor mengandung elemen yang bukan angka numerik.');
        }
    }
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
        sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm < 0.1 || isNaN(norm)) {
        throw new Error('Vektor biometrik wajah tidak valid (norma vektor mendekati nol atau artifisial).');
    }
    return vector;
}
function calculateEuclideanDistance(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        return 1.0;
    }
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
function calculateSimilarityPercent(distance) {
    const score = Math.round((1 - distance / 0.6) * 100);
    return Math.max(0, Math.min(100, score));
}
//# sourceMappingURL=biometric.util.js.map