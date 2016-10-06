//
//  Copyright © 2016 Project Llama. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

#ifndef SNAKIE_BOARD_H
#define SNAKIE_BOARD_H

#include <string.h>

#include <functional>
#include <iostream>
#include <random>
#include <vector>

const uint8_t Empty = 0;
const uint8_t SnakeHead = 1;
const uint8_t SnakeBody = 2;
const uint8_t Food = 3;
const uint8_t Edge = 4;

const uint8_t Up = 0;
const uint8_t Down = 1;
const uint8_t Left = 2;
const uint8_t Right = 3;

const std::function<void(int&, int&)> Directions[] = { [](int &i, int &j){ i--; },
                                                       [](int &i, int &j){ i++; },
                                                       [](int &i, int &j){ j--; },
                                                       [](int &i, int &j){ j++; } };

const char PrintedObject[] = {' ', 'O', 'o', 'X', '#'};

class Board {
 public:
    Board() {}
    Board(int width, int height) : mWidth(width), mHeight(height), mEmptyTilesCount(width * height) {
        mBoard = reinterpret_cast<uint8_t *>(malloc(width * height * sizeof(uint8_t)));
        memset(mBoard, Empty, width * height);
    }
    ~Board() {
        free(mBoard);
    }

    uint8_t at(int i, int j) {
        return mBoard[i * mWidth + j];
    }
    void set(int i, int j, uint8_t val) {
        if (val != Empty && mBoard[i * mWidth + j] == Empty) {
            mEmptyTilesCount--;
        }
        mBoard[i * mWidth + j] = val;
    }

    void setSnake(int i, int j, uint8_t dir) {
        set(i, j, SnakeHead);
        
        Directions[getReverse(dir)](i, j);
        set(i, j, SnakeBody);
    }
    void setSnake() {
        int i = -1, j = -1;
        while (i >= mWidth - 1 || j >= mHeight - 1 || i <= 1 || j <= 1) {
            getRandomCoordinate(i, j);
        }
        setSnake(i, j, getRandomDirection());
    }

    void print() {
        for (int i = 0; i < mWidth + 2; i++) {
            std::cout << PrintedObject[Edge] << ' ';
        }
        std::cout << '\n';
        for (int i = 0; i < mWidth; i++) {
            std::cout << PrintedObject[Edge] << ' ';
            for (int j = 0; j < mHeight; j++) {
                std::cout << PrintedObject[at(i, j)] << ' ';
            }
            std::cout << PrintedObject[Edge] << " \n";
        }
        for (int i = 0; i < mWidth + 2; i++) {
            std::cout << PrintedObject[Edge] << ' ';
        }
        std::cout << '\n';
    }

 private:
    int mWidth;
    int mHeight;
    uint8_t *mBoard;

    std::vector<int> mSnakeArray;

    std::random_device mRandomDevice;
    int mEmptyTilesCount;

    void getRandomCoordinate(int &i, int &j) {
        std::uniform_int_distribution<int> uniformDistribution(0, mEmptyTilesCount);
        int countDown = uniformDistribution(mRandomDevice);
        int index = 0;
        while (countDown > 0) {
            if (mBoard[index] == Empty) {
                countDown--;
            }
            index++;
        }
        i = index / mWidth;
        j = index % mWidth;
    }

    uint8_t getRandomDirection() {
        std::uniform_int_distribution<int> uniformDistribution(0, 3);
        return uniformDistribution(mRandomDevice);
    }

    uint8_t getReverse(uint8_t dir) {
        return dir % 2 ? dir - 1 : dir + 1;
    }
};

#endif // SNAKIE_BOARD_H
