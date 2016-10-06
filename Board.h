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

#include <algorithm>
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
        mSnakeArray.insert(mSnakeArray.begin(), i * mWidth + j);
        Directions[getReverse(dir)](i, j);
        set(i, j, SnakeBody);
        mSnakeArray.insert(mSnakeArray.begin(), i * mWidth + j);
        mLastDirection = dir;
    }
    void setSnake() {
        int i = -1, j = -1;
        while (i >= mWidth - 1 || j >= mHeight - 1 || i <= 1 || j <= 1) {
            getRandomCoordination(i, j);
        }
        setSnake(i, j, getRandomDirection());
    }

    int moveSnake(uint8_t dir) {
        int i = mSnakeArray.back() / mWidth;
        int j = mSnakeArray.back() % mWidth;
        mBoard[mSnakeArray.front()] = Empty;
        mSnakeArray.erase(mSnakeArray.begin());
        Directions[dir](i, j);
        if (!isValidPoint(i, j)) {
            return -1;
        }
        mBoard[mSnakeArray.back()] = SnakeBody;
        mSnakeArray.push_back(i * mWidth + j);
        mBoard[i * mWidth + j] = SnakeHead;

        return sqrt(pow(abs(mFoodX - i), 2) + pow(abs(mFoodY - j), 2));
    }
    int moveSnake() {
        return moveSnake(mLastDirection);
    }

    void appendSnake() {
        int i1 = mSnakeArray[1] / mWidth;
        int j1 = mSnakeArray[1] % mWidth;
        int i2 = mSnakeArray[0] / mWidth;
        int j2 = mSnakeArray[0] % mWidth;
        uint8_t dir = calcDirection(i1, j1, i2, j2);
        int i_t = i2, j_t = j2;
        Directions[dir](i2, j2);
        if (!isValidPoint(i2, j2)) {
            Directions[getReverse(dir)](i2, j2);
            for (uint8_t i = Up; i <= Right; i++) {
                if (i == dir) {
                    continue;
                } else {
                    Directions[i](i_t, j_t);
                    if (isValidPoint(i_t, j_t)) {
                        i2 = i_t;
                        j2 = j_t;
                        break;
                    } else {
                        i_t = i2;
                        j_t = j2;
                    }
                }
            }
        }
        mBoard[i2 * mWidth + j2] = SnakeBody;
        mSnakeArray.insert(mSnakeArray.begin(), i2 * mWidth + j2);
    }

    void setFood(int i, int j) {
        set(i, j, Food);
        mFoodX = i;
        mFoodY = j;
    }
    void setFood() {
        int i, j;
        getRandomCoordination(i, j);
        setFood(i, j);
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
    uint8_t mLastDirection = Up;

    std::random_device mRandomDevice;
    int mEmptyTilesCount;

    int mFoodX, mFoodY;

    void getRandomCoordination(int &i, int &j) {
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

    // 1 -> 2.
    uint8_t calcDirection(int i1, int j1, int i2, int j2) {
        int deltaI = i2 - i1, deltaJ = j2 - j1;
        if (deltaI == -1) {
            return Up;
        } else if (deltaI == 1) {
            return Down;
        } else if (deltaJ == -1) {
            return Left;
        } else if (deltaJ == 1) {
            return Right;
        } else {
            // TODO: Throw an exception.
            return 100;
        }
    }

    bool isValidPoint(int i, int j) {
        return i <= mWidth && j <= mHeight && i >= 0 && j >= 0 && std::find(mSnakeArray.begin(), mSnakeArray.end(), i * mWidth + j) == mSnakeArray.end();
    }
};

#endif // SNAKIE_BOARD_H
