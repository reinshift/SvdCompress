/**
 * SVD图像压缩核心算法
 * 实现奇异值分解(SVD)用于图像压缩
 */

class SVDImageCompressor {
    constructor() {
        this.epsilon = 1e-10; // 数值精度阈值
    }

    /**
     * 矩阵乘法
     */
    matrixMultiply(A, B) {
        const rows = A.length;
        const cols = B[0].length;
        const inner = B.length;
        const result = Array(rows).fill().map(() => Array(cols).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                for (let k = 0; k < inner; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    }

    /**
     * 矩阵转置
     */
    transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[j][i] = matrix[i][j];
            }
        }
        return result;
    }

    /**
     * 计算向量的L2范数
     */
    norm(vector) {
        return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    }

    /**
     * 向量归一化
     */
    normalize(vector) {
        const norm = this.norm(vector);
        return norm > this.epsilon ? vector.map(val => val / norm) : vector;
    }

    /**
     * 幂迭代法求最大特征值和特征向量
     */
    powerIteration(matrix, maxIterations = 100) {
        const n = matrix.length;
        let vector = Array(n).fill().map(() => Math.random() - 0.5);
        vector = this.normalize(vector);
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const newVector = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    newVector[i] += matrix[i][j] * vector[j];
                }
            }
            
            const newNormalizedVector = this.normalize(newVector);
            
            // 检查收敛
            let converged = true;
            for (let i = 0; i < n; i++) {
                if (Math.abs(newNormalizedVector[i] - vector[i]) > this.epsilon) {
                    converged = false;
                    break;
                }
            }
            
            vector = newNormalizedVector;
            if (converged) break;
        }
        
        // 计算特征值
        let eigenvalue = 0;
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += matrix[i][j] * vector[j];
            }
            eigenvalue += vector[i] * sum;
        }
        
        return { eigenvalue: Math.abs(eigenvalue), eigenvector: vector };
    }

    /**
     * 简化的SVD分解（使用幂迭代法）
     */
    svdDecomposition(matrix, k) {
        const m = matrix.length;
        const n = matrix[0].length;
        
        // 计算 A^T * A
        const AT = this.transpose(matrix);
        const ATA = this.matrixMultiply(AT, matrix);
        
        const U = [];
        const S = [];
        const VT = [];
        
        let currentMatrix = matrix.map(row => [...row]); // 深拷贝
        
        for (let i = 0; i < Math.min(k, Math.min(m, n)); i++) {
            // 计算当前矩阵的 A^T * A
            const currentAT = this.transpose(currentMatrix);
            const currentATA = this.matrixMultiply(currentAT, currentMatrix);
            
            // 求最大特征值和特征向量
            const { eigenvalue, eigenvector } = this.powerIteration(currentATA);
            
            if (eigenvalue < this.epsilon) break;
            
            const singularValue = Math.sqrt(eigenvalue);
            S.push(singularValue);
            
            // V的列向量
            VT.push([...eigenvector]);
            
            // 计算对应的U列向量
            const uVector = Array(m).fill(0);
            for (let j = 0; j < m; j++) {
                for (let l = 0; l < n; l++) {
                    uVector[j] += currentMatrix[j][l] * eigenvector[l];
                }
                uVector[j] /= singularValue;
            }
            U.push(uVector);
            
            // 从当前矩阵中减去当前的秩1近似
            for (let j = 0; j < m; j++) {
                for (let l = 0; l < n; l++) {
                    currentMatrix[j][l] -= singularValue * uVector[j] * eigenvector[l];
                }
            }
        }
        
        return { U, S, VT };
    }

    /**
     * 使用SVD重构矩阵
     */
    reconstructMatrix(U, S, VT, k) {
        const m = U[0].length;
        const n = VT[0].length;
        const result = Array(m).fill().map(() => Array(n).fill(0));
        
        const actualK = Math.min(k, S.length);
        
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let l = 0; l < actualK; l++) {
                    result[i][j] += U[l][i] * S[l] * VT[l][j];
                }
            }
        }
        
        return result;
    }

    /**
     * 压缩单个颜色通道
     */
    compressChannel(channelData, width, height, k) {
        // 将一维数组转换为二维矩阵
        const matrix = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(channelData[i * width + j]);
            }
            matrix.push(row);
        }
        
        // 执行SVD分解
        const { U, S, VT } = this.svdDecomposition(matrix, k);
        
        // 重构矩阵
        const reconstructed = this.reconstructMatrix(U, S, VT, k);
        
        // 转换回一维数组并确保值在有效范围内
        const result = [];
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const value = Math.max(0, Math.min(255, Math.round(reconstructed[i][j])));
                result.push(value);
            }
        }
        
        return { compressedData: result, singularValues: S };
    }

    /**
     * 压缩图像
     */
    compressImage(imageData, k) {
        return this.compressImageWithProgress(imageData, k, null);
    }

    /**
     * 带进度回调的压缩图像
     */
    async compressImageWithProgress(imageData, k, progressCallback) {
        const { data, width, height } = imageData;
        const isGrayscale = this.isGrayscaleImage(data);

        if (isGrayscale) {
            // 灰度图像处理
            if (progressCallback) await progressCallback('正在提取灰度数据...');

            const grayData = [];
            for (let i = 0; i < data.length; i += 4) {
                grayData.push(data[i]); // 使用R通道作为灰度值
            }

            if (progressCallback) await progressCallback('正在压缩灰度通道...');
            const { compressedData, singularValues } = this.compressChannel(grayData, width, height, k);

            if (progressCallback) await progressCallback('正在重构图像数据...');
            // 重新构建RGBA数据
            const resultData = new Uint8ClampedArray(data.length);
            for (let i = 0; i < compressedData.length; i++) {
                const pixelIndex = i * 4;
                const grayValue = compressedData[i];
                resultData[pixelIndex] = grayValue;     // R
                resultData[pixelIndex + 1] = grayValue; // G
                resultData[pixelIndex + 2] = grayValue; // B
                resultData[pixelIndex + 3] = 255;       // A
            }

            return {
                compressedImageData: new ImageData(resultData, width, height),
                singularValues: [singularValues],
                isGrayscale: true
            };
        } else {
            // 彩色图像处理 - 分别处理RGB三个通道
            if (progressCallback) await progressCallback('正在分离RGB通道...');

            const channels = [[], [], []]; // R, G, B

            for (let i = 0; i < data.length; i += 4) {
                channels[0].push(data[i]);     // R
                channels[1].push(data[i + 1]); // G
                channels[2].push(data[i + 2]); // B
            }

            const compressedChannels = [];
            const allSingularValues = [];
            const channelNames = ['红色', '绿色', '蓝色'];

            for (let c = 0; c < 3; c++) {
                if (progressCallback) await progressCallback(`正在压缩${channelNames[c]}通道...`);
                const { compressedData, singularValues } = this.compressChannel(channels[c], width, height, k);
                compressedChannels.push(compressedData);
                allSingularValues.push(singularValues);
            }

            if (progressCallback) await progressCallback('正在合并RGB通道...');
            // 重新构建RGBA数据
            const resultData = new Uint8ClampedArray(data.length);
            for (let i = 0; i < width * height; i++) {
                const pixelIndex = i * 4;
                resultData[pixelIndex] = compressedChannels[0][i];     // R
                resultData[pixelIndex + 1] = compressedChannels[1][i]; // G
                resultData[pixelIndex + 2] = compressedChannels[2][i]; // B
                resultData[pixelIndex + 3] = 255;                      // A
            }

            return {
                compressedImageData: new ImageData(resultData, width, height),
                singularValues: allSingularValues,
                isGrayscale: false
            };
        }
    }

    /**
     * 检测图像是否为灰度图像
     */
    isGrayscaleImage(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (Math.abs(r - g) > 5 || Math.abs(g - b) > 5 || Math.abs(r - b) > 5) {
                return false;
            }
        }
        return true;
    }

    /**
     * 计算压缩比
     */
    calculateCompressionRatio(width, height, k, isGrayscale) {
        const originalSize = width * height * (isGrayscale ? 1 : 3);
        const compressedSize = k * (width + height + 1) * (isGrayscale ? 1 : 3);
        return originalSize / compressedSize;
    }

    /**
     * 根据奇异值能量百分比计算需要保留的奇异值数量
     */
    calculateSingularValueCountByPercentage(singularValues, percentage) {
        if (!singularValues || singularValues.length === 0) return 1;

        // 计算总能量（奇异值的平方和）
        const totalEnergy = singularValues.reduce((sum, sv) => sum + sv * sv, 0);
        const targetEnergy = totalEnergy * (percentage / 100);

        let cumulativeEnergy = 0;
        let k = 0;

        for (let i = 0; i < singularValues.length; i++) {
            cumulativeEnergy += singularValues[i] * singularValues[i];
            k = i + 1;

            if (cumulativeEnergy >= targetEnergy) {
                break;
            }
        }

        return Math.max(1, k);
    }

    /**
     * 获取图像的奇异值分布（用于百分比模式）
     */
    getSingularValuesDistribution(imageData) {
        const { data, width, height } = imageData;
        const isGrayscale = this.isGrayscaleImage(data);

        if (isGrayscale) {
            // 灰度图像处理
            const grayData = [];
            for (let i = 0; i < data.length; i += 4) {
                grayData.push(data[i]);
            }

            const matrix = [];
            for (let i = 0; i < height; i++) {
                const row = [];
                for (let j = 0; j < width; j++) {
                    row.push(grayData[i * width + j]);
                }
                matrix.push(row);
            }

            // 快速SVD分解获取奇异值
            const { S } = this.svdDecomposition(matrix, Math.min(width, height));
            return S;
        } else {
            // 彩色图像：取RGB三个通道的平均奇异值
            const channels = [[], [], []];

            for (let i = 0; i < data.length; i += 4) {
                channels[0].push(data[i]);
                channels[1].push(data[i + 1]);
                channels[2].push(data[i + 2]);
            }

            const allSingularValues = [];

            for (let c = 0; c < 3; c++) {
                const matrix = [];
                for (let i = 0; i < height; i++) {
                    const row = [];
                    for (let j = 0; j < width; j++) {
                        row.push(channels[c][i * width + j]);
                    }
                    matrix.push(row);
                }

                const { S } = this.svdDecomposition(matrix, Math.min(width, height));
                allSingularValues.push(S);
            }

            // 计算三个通道的平均奇异值
            const avgSingularValues = [];
            const maxLength = Math.max(...allSingularValues.map(sv => sv.length));

            for (let i = 0; i < maxLength; i++) {
                let sum = 0;
                let count = 0;
                for (let c = 0; c < 3; c++) {
                    if (i < allSingularValues[c].length) {
                        sum += allSingularValues[c][i];
                        count++;
                    }
                }
                if (count > 0) {
                    avgSingularValues.push(sum / count);
                }
            }

            return avgSingularValues;
        }
    }
}
