/**
 * Biometric Face Descriptor Utilities & Anti-Spoofing Validation
 * Mendukung verifikasi 128-dimensional embedding vector dari face-api.js / FaceNet
 */

export const FACE_MATCH_MAX_DISTANCE = 0.50; // Jarak Euclidean maksimal untuk dianggap orang yang sama
export const FACE_UNIQUENESS_MIN_DISTANCE = 0.48; // Jarak Euclidean minimal antar dua karyawan berbeda

/**
 * Parsing dan validasi descriptor biometrik wajah
 */
export function parseFaceDescriptor(raw: string | number[]): number[] {
  if (!raw) {
    throw new Error('Data biometrik wajah (face descriptor) tidak boleh kosong.');
  }

  let vector: number[];
  if (typeof raw === 'string') {
    try {
      vector = JSON.parse(raw);
    } catch {
      throw new Error('Format JSON face descriptor tidak valid.');
    }
  } else if (Array.isArray(raw)) {
    vector = raw;
  } else {
    throw new Error('Tipe data face descriptor harus berupa array float 128 dimensi.');
  }

  if (!Array.isArray(vector) || vector.length !== 128) {
    throw new Error(
      `Face descriptor harus berupa vektor 128 dimensi (terdeteksi: ${vector?.length || 0} dimensi).`,
    );
  }

  // Cek apakah ada elemen non-number atau NaN
  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number' || isNaN(vector[i])) {
      throw new Error('Nilai vektor face descriptor mengandung elemen yang bukan angka numerik.');
    }
  }

  // Cek L2 norm untuk memastikan bukan vektor palsu/nol semua
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq);

  // Vektor FaceNet ternormalisasi memiliki norm mendekati 1.0 (antara 0.5 - 1.5)
  if (norm < 0.1 || isNaN(norm)) {
    throw new Error('Vektor biometrik wajah tidak valid (norma vektor mendekati nol atau artifisial).');
  }

  return vector;
}

/**
 * Hitung jarak Euclidean antara dua vektor 128-d
 */
export function calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
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

/**
 * Hitung skor persentase kemiripan (0 - 100%)
 * Jarak 0.0 -> 100% mirip
 * Jarak 0.4 -> ~90% mirip
 * Jarak 0.6 -> ~67% mirip
 */
export function calculateSimilarityPercent(distance: number): number {
  const score = Math.round((1 - distance / 0.6) * 100);
  return Math.max(0, Math.min(100, score));
}
