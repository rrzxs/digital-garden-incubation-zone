/**
 * 代码雨屏保 - 交互逻辑
 * Matrix 风格的代码雨，落下的是真实的代码片段
 */

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // 代码片段库
    // -------------------------------------------------------------------------
    const CODE_SNIPPETS = {
        javascript: [
            'const data = await fetch(url);',
            'import { useState } from "react";',
            'export default function App() {}',
            'const arr = [1, 2, 3].map(x => x * 2);',
            'async function init() { await load(); }',
            'class Component extends React.Component {}',
            'const { name, age } = user;',
            'console.log("Hello World");',
            'document.querySelector(".app");',
            'localStorage.setItem("key", value);',
            'JSON.parse(response);',
            'Promise.all(promises);',
            'const fn = () => {};'
        ],
        python: [
            'def main(): pass',
            'import numpy as np',
            'from typing import List, Optional',
            'class Model(BaseModel):',
            'async def fetch_data(url):',
            'result = [x for x in data if x > 0]',
            'with open("file.txt") as f:',
            'lambda x: x * 2',
            'self.__init__(self):',
            'raise ValueError("error")',
            'return {"status": "ok"}',
            'print(f"Value: {val}")',
            'if __name__ == "__main__":'
        ],
        rust: [
            'fn main() { println!(); }',
            'let mut data = Vec::new();',
            'impl Trait for Struct {}',
            'pub async fn run() -> Result<()>',
            'use std::collections::HashMap;',
            'match option {',
            'Some(value) => value,',
            'None => default,',
            '&str, &String, &Vec<T>',
            'struct User { name: String }',
            'enum Result<T, E> { Ok(T), Err(E) }',
            'unsafe { *ptr }',
            'self.inner.lock().unwrap();'
        ],
        go: [
            'package main',
            'import "fmt"',
            'func main() { fmt.Println() }',
            'type Server struct {}',
            'go func() { ch <- data }()',
            'if err != nil { return err }',
            'defer file.Close()',
            'var buf []byte',
            'make(chan int, 10)',
            'interface{}',
            'select { case <-ch: }',
            'for range items {}',
            's := strings.Builder{}'
        ]
    };

    // -------------------------------------------------------------------------
    // 配置常量
    // -------------------------------------------------------------------------
    const CONFIG = {
        fontSize: 14,
        fontFamily: 'Share Tech Mono, monospace',
        columnSpeed: { min: 2, max: 8 },
        columnDensity: 0.03,
        fadeSpeed: 0.05,
        colors: {
            head: '#ffffff',
            tail: '#00ff66',
            glow: 'rgba(0, 255, 102, 0.8)'
        }
    };

    // -------------------------------------------------------------------------
    // Canvas 设置
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('code-rain');
    const ctx = canvas.getContext('2d');

    let width, height, columns;
    let drops = [];
    let paused = false;
    let currentLang = 'all';
    let animationId = null;

    // -------------------------------------------------------------------------
    // 初始化
    // -------------------------------------------------------------------------
    function init() {
        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('click', togglePause);
        
        document.getElementById('pause-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePause();
        });
        
        document.getElementById('lang-select').addEventListener('change', (e) => {
            e.stopPropagation();
            currentLang = e.target.value;
            resetDrops();
        });

        animate();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        
        const columnCount = Math.floor(width / CONFIG.fontSize);
        columns = columnCount;
        resetDrops();
    }

    function resetDrops() {
        drops = [];
        for (let i = 0; i < columns; i++) {
            if (Math.random() < CONFIG.columnDensity * 10) {
                drops.push(createDrop(i));
            }
        }
    }

    // -------------------------------------------------------------------------
    // 代码雨列
    // -------------------------------------------------------------------------
    function createDrop(columnIndex) {
        const langs = currentLang === 'all' 
            ? Object.keys(CODE_SNIPPETS) 
            : [currentLang];
        const lang = langs[Math.floor(Math.random() * langs.length)];
        const snippets = CODE_SNIPPETS[lang];
        const snippet = snippets[Math.floor(Math.random() * snippets.length)];
        
        return {
            x: columnIndex * CONFIG.fontSize,
            y: Math.random() * -height,
            speed: CONFIG.columnSpeed.min + Math.random() * (CONFIG.columnSpeed.max - CONFIG.columnSpeed.min),
            text: snippet,
            opacity: 1,
            length: snippet.length
        };
    }

    // -------------------------------------------------------------------------
    // 动画循环
    // -------------------------------------------------------------------------
    function animate() {
        if (!paused) {
            // 半透明黑色覆盖，产生拖尾效果
            ctx.fillStyle = `rgba(10, 10, 10, ${CONFIG.fadeSpeed})`;
            ctx.fillRect(0, 0, width, height);

            ctx.font = `${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
            ctx.textBaseline = 'top';

            // 更新和绘制每一列
            drops.forEach((drop, index) => {
                // 绘制发光效果
                ctx.shadowColor = CONFIG.colors.glow;
                ctx.shadowBlur = 10;
                
                // 绘制头部（最亮）
                ctx.fillStyle = CONFIG.colors.head;
                const headChar = drop.text[0];
                ctx.fillText(headChar, drop.x, drop.y);
                
                // 绘制尾部
                ctx.shadowBlur = 0;
                ctx.fillStyle = CONFIG.colors.tail;
                for (let i = 1; i < drop.text.length; i++) {
                    const charY = drop.y - i * CONFIG.fontSize;
                    if (charY > 0 && charY < height) {
                        const alpha = 1 - (i / drop.text.length) * 0.7;
                        ctx.fillStyle = `rgba(0, 255, 102, ${alpha})`;
                        ctx.fillText(drop.text[i], drop.x, charY);
                    }
                }

                // 更新位置
                drop.y += drop.speed;

                // 超出屏幕则重置
                if (drop.y - drop.text.length * CONFIG.fontSize > height) {
                    drops[index] = createDrop(Math.floor(drop.x / CONFIG.fontSize));
                }
            });

            // 随机添加新列
            if (Math.random() < 0.05 && drops.length < columns * CONFIG.columnDensity) {
                const newColumn = Math.floor(Math.random() * columns);
                drops.push(createDrop(newColumn));
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    // -------------------------------------------------------------------------
    // 交互控制
    // -------------------------------------------------------------------------
    function togglePause() {
        paused = !paused;
        document.getElementById('pause-btn').textContent = paused ? '继续' : '暂停';
    }

    // -------------------------------------------------------------------------
    // 启动
    // -------------------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
