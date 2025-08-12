/**
 * SVD图像压缩演示主脚本
 */

class SVDImageDemo {
    constructor() {
        this.svdCompressor = new SVDImageCompressor();
        this.currentImage = null;
        this.currentImageData = null;
        this.compressionData = [];
        this.singularValuesCache = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeChart();
    }

    initializeElements() {
        // 获取DOM元素
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.compressedCanvas = document.getElementById('compressedCanvas');
        this.singularValuesSlider = document.getElementById('singularValues');
        this.svdValueDisplay = document.getElementById('svdValue');
        this.compressBtn = document.getElementById('compressBtn');
        this.modeToggle = document.getElementById('modeToggle');
        this.sliderLabel = document.getElementById('sliderLabel');
        this.chartCanvas = document.getElementById('chartCanvas');
        this.chartPlaceholder = document.getElementById('chartPlaceholder');
        this.resultPlaceholder = document.getElementById('resultPlaceholder');

        // 进度条元素
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        // 信息显示元素
        this.imageType = document.getElementById('imageType');
        this.imageDimensions = document.getElementById('imageDimensions');
        this.compressionRatio = document.getElementById('compressionRatio');

        // 示例图片网格
        this.examplesGrid = document.getElementById('examplesGrid');
    }

    bindEvents() {
        // 文件上传事件
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 滑块事件
        this.singularValuesSlider.addEventListener('input', (e) => this.handleSliderChange(e));

        // 模式切换事件
        this.modeToggle.addEventListener('change', (e) => this.handleModeToggle(e));

        // 压缩按钮事件
        this.compressBtn.addEventListener('click', () => this.compressImage());
        
        // 示例图片选择事件
        this.examplesGrid.addEventListener('click', (e) => this.handleExampleSelect(e));
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.loadImage(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            this.loadImage(files[0]);
        }
    }

    handleSliderChange(event) {
        const value = parseInt(event.target.value);
        const isPercentageMode = this.modeToggle.checked;

        // 确保获取到正确的DOM元素
        const svdValueElement = document.getElementById('svdValue');
        if (svdValueElement) {
            if (isPercentageMode) {
                svdValueElement.textContent = `${value}%`;
            } else {
                svdValueElement.textContent = value;
            }
        }

        if (this.currentImageData) {
            this.updateCompressionRatioAsync(value, isPercentageMode);
        }
    }

    handleModeToggle(event) {
        const isPercentageMode = event.target.checked;

        if (isPercentageMode) {
            // 切换到百分比模式
            this.sliderLabel.innerHTML = '保留奇异值百分比: <span id="svdValue">50%</span>';
            this.singularValuesSlider.min = 1;
            this.singularValuesSlider.max = 100;
            this.singularValuesSlider.value = 50;
        } else {
            // 切换到数量模式
            this.sliderLabel.innerHTML = '保留奇异值数量: <span id="svdValue">50</span>';
            this.singularValuesSlider.min = 1;

            if (this.currentImageData) {
                const maxSingularValues = Math.min(this.currentImageData.width, this.currentImageData.height);
                this.singularValuesSlider.max = maxSingularValues;
                this.singularValuesSlider.value = Math.min(50, maxSingularValues);
            } else {
                this.singularValuesSlider.max = 100;
                this.singularValuesSlider.value = 50;
            }
        }

        // 重新获取svdValue元素引用
        this.svdValueDisplay = document.getElementById('svdValue');

        // 更新显示
        if (isPercentageMode) {
            this.svdValueDisplay.textContent = '50%';
        } else {
            this.svdValueDisplay.textContent = this.singularValuesSlider.value;
        }

        if (this.currentImageData) {
            const value = parseInt(this.singularValuesSlider.value);
            this.updateCompressionRatioAsync(value, isPercentageMode);
        }
    }

    handleExampleSelect(event) {
        const exampleItem = event.target.closest('.example-item');
        if (exampleItem) {
            const imageSrc = exampleItem.dataset.src;
            this.loadImageFromUrl(imageSrc);
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.displayOriginalImage(img);
                this.enableControls();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadImageFromUrl(url) {
        const img = new Image();

        // 设置crossOrigin以处理跨域问题
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            this.currentImage = img;
            this.displayOriginalImage(img);
            this.enableControls();
        };

        img.onerror = (error) => {
            console.error('Failed to load example image:', url, error);
            // 如果跨域失败，尝试不设置crossOrigin
            if (img.crossOrigin) {
                console.log('Retrying without crossOrigin...');
                const retryImg = new Image();
                retryImg.onload = () => {
                    this.currentImage = retryImg;
                    this.displayOriginalImage(retryImg);
                    this.enableControls();
                };
                retryImg.onerror = () => {
                    alert('无法加载示例图片，请尝试上传本地图片。这可能是由于浏览器的安全限制。');
                };
                retryImg.src = url;
            } else {
                alert('无法加载示例图片，请尝试上传本地图片。');
            }
        };

        img.src = url;
    }

    displayOriginalImage(img) {
        // 重置上传区域状态
        this.resetUploadArea();

        // 设置canvas尺寸
        const maxWidth = 400;
        const maxHeight = 300;
        let { width, height } = this.calculateDisplaySize(img.width, img.height, maxWidth, maxHeight);

        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.originalCanvas.style.display = 'block';

        // 绘制图像
        const ctx = this.originalCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 获取图像数据
        this.currentImageData = ctx.getImageData(0, 0, width, height);

        // 清除缓存的奇异值
        this.singularValuesCache = null;

        // 清除之前的压缩结果
        this.clearCompressedResult();

        // 更新图像信息
        this.updateImageInfo();

        // 隐藏上传占位符
        this.uploadArea.querySelector('.upload-placeholder').style.display = 'none';
    }

    resetUploadArea() {
        // 重置文件输入
        this.imageInput.value = '';

        // 清除拖拽状态
        this.uploadArea.classList.remove('dragover');
    }

    clearCompressedResult() {
        // 隐藏压缩后的canvas
        this.compressedCanvas.style.display = 'none';

        // 显示结果占位符
        this.resultPlaceholder.style.display = 'block';

        // 隐藏进度条
        this.hideProgress();
    }

    calculateDisplaySize(originalWidth, originalHeight, maxWidth, maxHeight) {
        const aspectRatio = originalWidth / originalHeight;
        
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    updateImageInfo() {
        if (!this.currentImageData) return;

        const isGrayscale = this.svdCompressor.isGrayscaleImage(this.currentImageData.data);
        this.imageType.textContent = isGrayscale ? '灰度图像' : '彩色图像';
        this.imageDimensions.textContent = `${this.currentImageData.width} × ${this.currentImageData.height}`;

        // 根据当前模式更新滑块
        const isPercentageMode = this.modeToggle.checked;

        if (isPercentageMode) {
            // 百分比模式：保持1-100的范围
            this.singularValuesSlider.min = 1;
            this.singularValuesSlider.max = 100;
            this.singularValuesSlider.value = 50;
            // 确保获取正确的DOM元素
            const svdValueElement = document.getElementById('svdValue');
            if (svdValueElement) {
                svdValueElement.textContent = '50%';
            }
        } else {
            // 数量模式：根据图像尺寸设置最大值
            const maxSingularValues = Math.min(this.currentImageData.width, this.currentImageData.height);
            this.singularValuesSlider.min = 1;
            this.singularValuesSlider.max = maxSingularValues;
            this.singularValuesSlider.value = Math.min(50, maxSingularValues);
            // 确保获取正确的DOM元素
            const svdValueElement = document.getElementById('svdValue');
            if (svdValueElement) {
                svdValueElement.textContent = this.singularValuesSlider.value;
            }
        }

        const value = parseInt(this.singularValuesSlider.value);
        this.updateCompressionRatioAsync(value, isPercentageMode);
    }

    updateCompressionRatioDisplay(k) {
        if (!this.currentImageData) return;

        const isGrayscale = this.svdCompressor.isGrayscaleImage(this.currentImageData.data);
        const ratio = this.svdCompressor.calculateCompressionRatio(
            this.currentImageData.width,
            this.currentImageData.height,
            k,
            isGrayscale
        );

        this.compressionRatio.textContent = `${ratio.toFixed(2)}:1`;
    }

    async updateCompressionRatioAsync(value, isPercentageMode) {
        if (!this.currentImageData) return;

        try {
            const actualK = await this.getActualSingularValueCount(value, isPercentageMode);
            this.updateCompressionRatioDisplay(actualK);
        } catch (error) {
            console.warn('更新压缩比失败:', error);
            // 使用估算值作为备用
            const estimatedK = this.estimateSingularValueCount(isPercentageMode ? value : value);
            this.updateCompressionRatioDisplay(estimatedK);
        }
    }

    addCompressionDataPoint(k, ratio) {
        // 添加数据点到图表
        const existingIndex = this.compressionData.findIndex(point => point.k === k);
        if (existingIndex >= 0) {
            this.compressionData[existingIndex] = { k, ratio };
        } else {
            this.compressionData.push({ k, ratio });
        }

        // 按k值排序
        this.compressionData.sort((a, b) => a.k - b.k);

        this.drawChart();
    }

    enableControls() {
        this.singularValuesSlider.disabled = false;
        this.compressBtn.disabled = false;
        this.modeToggle.disabled = false;
    }

    async getActualSingularValueCount(value, isPercentageMode) {
        if (!this.currentImageData) return value;

        if (!isPercentageMode) {
            return value;
        }

        // 百分比模式：使用简化的估算方法，避免复杂的SVD计算
        return this.estimateSingularValueCount(value);
    }

    estimateSingularValueCount(percentage) {
        // 改进的估算方法：考虑奇异值的典型分布特性
        const maxSingularValues = Math.min(this.currentImageData.width, this.currentImageData.height);
        const ratio = percentage / 100;

        // 使用平方根函数来模拟奇异值的能量分布
        // 前面的奇异值通常包含更多能量
        const k = Math.max(1, Math.floor(Math.sqrt(ratio) * maxSingularValues));
        return Math.min(k, maxSingularValues);
    }

    async compressImage() {
        if (!this.currentImageData) return;

        const value = parseInt(this.singularValuesSlider.value);
        const isPercentageMode = this.modeToggle.checked;

        // 显示进度条
        this.showProgress();
        this.compressBtn.disabled = true;
        this.compressBtn.textContent = '压缩中...';

        try {
            const k = await this.getActualSingularValueCount(value, isPercentageMode);
            // 使用分步处理来避免阻塞UI
            this.compressImageWithProgress(k, value, isPercentageMode);
        } catch (error) {
            console.error('获取奇异值数量失败:', error);
            this.hideProgress();
            this.compressBtn.disabled = false;
            this.compressBtn.textContent = '开始压缩';
            alert('无法计算奇异值数量，请重试');
        }
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '正在初始化...';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    async compressImageWithProgress(k, originalValue, isPercentageMode) {
        try {
            const isGrayscale = this.svdCompressor.isGrayscaleImage(this.currentImageData.data);

            this.updateProgress(10, '正在准备图像数据...');
            await this.delay(50);

            this.updateProgress(20, '正在执行SVD分解...');
            await this.delay(50);

            // 分步执行压缩
            const result = await this.performCompressionSteps(k, isGrayscale);

            this.updateProgress(90, '正在生成压缩图像...');
            await this.delay(50);

            this.displayCompressedImage(result.compressedImageData);

            // 计算压缩比并添加到图表
            const ratio = this.svdCompressor.calculateCompressionRatio(
                this.currentImageData.width,
                this.currentImageData.height,
                k,
                isGrayscale
            );

            // 使用原始值作为图表的x轴（保持用户输入的值）
            const chartValue = isPercentageMode ? originalValue / 100 * Math.min(this.currentImageData.width, this.currentImageData.height) : k;
            this.addCompressionDataPoint(chartValue, ratio);

            this.updateProgress(100, '压缩完成！');
            await this.delay(500);

            this.hideProgress();
            this.compressBtn.disabled = false;
            this.compressBtn.textContent = '开始压缩';

        } catch (error) {
            console.error('压缩失败:', error);
            this.hideProgress();
            alert('图像压缩失败，请尝试较小的奇异值数量');
            this.compressBtn.disabled = false;
            this.compressBtn.textContent = '开始压缩';
        }
    }

    async performCompressionSteps(k, isGrayscale) {
        // 分步执行以避免长时间阻塞
        const steps = isGrayscale ? 3 : 9; // 灰度图3步，彩色图9步（每个通道3步）
        let currentStep = 0;

        const updateStepProgress = async (stepName) => {
            currentStep++;
            const percent = 20 + (currentStep / steps) * 60; // 20-80%的进度用于SVD计算
            this.updateProgress(percent, stepName);
            await this.delay(10); // 让UI有时间更新
        };

        // 重写压缩函数以支持进度回调
        return await this.svdCompressor.compressImageWithProgress(
            this.currentImageData,
            k,
            updateStepProgress
        );
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayCompressedImage(imageData) {
        this.compressedCanvas.width = imageData.width;
        this.compressedCanvas.height = imageData.height;
        
        const ctx = this.compressedCanvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        this.compressedCanvas.style.display = 'block';
        this.resultPlaceholder.style.display = 'none';
    }

    initializeChart() {
        this.compressionData = [];
        this.chartCanvas.style.display = 'none';
    }



    drawChart() {
        if (this.compressionData.length === 0) return;
        
        this.chartCanvas.style.display = 'block';
        this.chartPlaceholder.style.display = 'none';
        
        const ctx = this.chartCanvas.getContext('2d');
        const width = this.chartCanvas.width;
        const height = this.chartCanvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 设置边距
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // 计算数据范围
        const maxK = Math.max(...this.compressionData.map(d => d.k));
        const maxRatio = Math.max(...this.compressionData.map(d => d.ratio));
        const minK = Math.min(...this.compressionData.map(d => d.k));
        const minRatio = Math.min(...this.compressionData.map(d => d.ratio));
        
        // 绘制坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(margin.left, height - margin.bottom);
        ctx.lineTo(width - margin.right, height - margin.bottom);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, height - margin.bottom);
        ctx.stroke();
        
        // 绘制数据点和连线
        ctx.strokeStyle = '#4CAF50';
        ctx.fillStyle = '#4CAF50';
        ctx.lineWidth = 2;
        
        if (this.compressionData.length > 1) {
            ctx.beginPath();
            this.compressionData.forEach((point, index) => {
                const x = margin.left + (point.k - minK) / (maxK - minK) * chartWidth;
                const y = height - margin.bottom - (point.ratio - minRatio) / (maxRatio - minRatio) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
        
        // 绘制数据点
        this.compressionData.forEach(point => {
            const x = margin.left + (point.k - minK) / (maxK - minK) * chartWidth;
            const y = height - margin.bottom - (point.ratio - minRatio) / (maxRatio - minRatio) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // 绘制标签
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('奇异值数量', width / 2, height - 5);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('压缩比', 0, 0);
        ctx.restore();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SVDImageDemo();
});
