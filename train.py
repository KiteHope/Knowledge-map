import os
import re
import xlwt
import time
import yaml
import numpy as np
import multiprocessing
from aip import AipNlp
import matplotlib.pyplot as plt
from gensim.models import Word2Vec
from gensim.corpora.dictionary import Dictionary
from keras.models import Sequential
from keras.models import model_from_yaml
from keras.layers.embeddings import Embedding
from keras.layers.recurrent import LSTM
from keras.layers.core import Dense, Dropout, Activation
from keras.preprocessing import sequence
from keras import backend as k
from sklearn.model_selection import train_test_split


""" 权限验证 """
TIME = 0.06
APP_ID = '11463858'
API_KEY = 'q9NmxfajPLzvPB5dxbNQb7Sj'
SECRET_KEY = 'zN0wwiNBmNvhLGCIPOGn0qZcr06qqexX'
client = AipNlp(APP_ID, API_KEY, SECRET_KEY)

batch_size = 16  # batch_size
n_epoch = 4     # LSTM训练迭代次数


class GridSearch(object):
    param_grid = {}
    _accuracy = []
    _params = []

    def __init__(self, param_grid={}):
        self.param_grid = param_grid

    def split(self):
        keys = list(self.param_grid.keys())
        values = list(self.param_grid.values())
        dict = {}
        self.ite(dict, keys, values, 0)
        return self._params

    def ite(self, dict, keys, values, cur):
        if cur >= len(keys):
            self._params.append(dict.copy())
        else:
            for value in values[cur]:
                dict[keys[cur]] = value
                self.ite(dict, keys, values, cur + 1)

    def fit(self, dataset, label):
        # 分割参数字典
        self.split()
        for i in range(len(self._params)):
            self._accuracy.append(train(dataset, label, self._params[i]['vocab_dim'], self._params[i]['n_exposures'],
                                       self._params[i]['window_size'], self._params[i]['n_iterations'],
                                       self._params[i]['maxlen'], self._params[i]['lstm_dim']))
        for i in range(len(self._accuracy)):
            self._params[i]["accu"] = self._accuracy[i]

    def get_best(self):
        index = np.argmax(self._accuracy)
        print("The best score: ", self._accuracy[index])
        print("The best params: ", self._params[index])

    def get_excel(self):
        book = xlwt.Workbook()
        sheet = book.add_sheet("1")
        keys = list(self._params[0].keys())
        for i in range(len(keys)):
            sheet.write(0, i, keys[i])
        for i in range(len(self._params)):
            values = list(self._params[i].values())
            for j in range(len(values)):
                sheet.write(i + 1, j, values[j])
        book.save(os.getcwd() + "\GridSearch_Result.xls")
        print("Result saved!")


def plot_model(dict, vocab_dim, maxlen, n_iterations, n_exposures, window_size, lstm_dim):
    isExists = os.path.exists("figures/")
    if not isExists:
        os.makedirs("figures/")

    # plot accuracy
    plt.figure()
    plt.subplot(211)
    plt.plot(dict['acc'])
    plt.plot(dict['val_acc'])
    plt.title('model accuracy')
    plt.ylabel('accuracy')
    plt.xlabel('epoch')
    plt.legend(['train', 'test'], loc='upper left')

    # plot loss
    plt.subplot(212)
    plt.plot(dict['loss'])
    plt.plot(dict['val_loss'])
    plt.title('model loss')
    plt.ylabel('loss')
    plt.xlabel('epoch')
    plt.legend(['train', 'test'], loc='upper left')
    plt.subplots_adjust(left=None, bottom=None, right=None, top=None,
                        wspace=None, hspace=0.5)
    plt.savefig('figures/{0}_{1}_{2}_{3}_{4}_{5}.png'.format(str(vocab_dim), str(maxlen), str(n_iterations),
                                                             str(n_exposures), str(window_size), str(lstm_dim)))


# 加载数据
def loadfile():
    train = []
    label = []
    name = []
    dirs = os.listdir("D:/train")
    for dir in dirs:
        train_temp = []
        name.append(dir.replace('.txt', ''))
        lines = open("D:/train/%s" % dir, encoding='utf-8').readlines()
        for line in lines:
            line = line.encode('utf-8').decode('utf-8-sig')
            temp = line.split(' ')
            train_temp.append(temp[0])
            label.append(int(temp[1].replace('\n', '')))
        train.append(train_temp)
        print(train_temp)
    return train, label, name


# 生成停用词集合
def getstopword(stopwordPath):
    stoplist = set()
    for line in stopwordPath:
        stoplist.add(line.strip())
    return stoplist


# 分词，并获取词性
def cut(string):
    items = []
    pos = []
    for item in client.lexer(string)["items"]:
        items.append(item["item"])
        if item["pos"] == "":
            pos.append(item["ne"])
        else:
            pos.append(item["pos"])
    return items, pos


# 逐句分词，并加工处理
def tokenizer(items, namelist):
    # 获取停用词集合
    stopwordPath = open('chineseStopWords_1.txt', 'r')
    stoplist = getstopword(stopwordPath)
    stopwordPath.close()

    # 逐句分词，去除停用词
    text_list = []
    for text, name in zip(items, namelist):
        for document in text:
            time.sleep(0.15)
            seg_list, pos = cut(document)
            for i in range(len(seg_list)):
                if pos[i] in ['TIME', 'LOC', 'PER', 'nr', 'nz', 'ORG', 'nt', 'ns', 'm']:
                    if seg_list[i] == name:
                        seg_list[i] = "他"
                    else:
                        seg_list[i] = pos[i]
            # print(seg_list, pos)
            fenci = []
            for item in seg_list:
                if item not in stoplist and re.match(r'-?\d+\.?\d*', item) is None and len(item.strip()) > 0:
                    fenci.append(item)
            if len(fenci) > 0:
                text_list.append(fenci)
    return text_list


# 制作基于Word2vec_model的字典，返回词语的索引值，用于embedding层输入
def create_dictionaries(maxlen, model=None, combined=None):
    """
    :param model: 训练好的Word2vec_model
    :param combined: 文本
    :return:  model词语索引字典，model词语向量字典，填充后的文本索引列表
    """
    if (combined is not None) and (model is not None):
        gensim_dict = Dictionary()
        gensim_dict.doc2bow(model.wv.vocab.keys(), allow_update=True)
        # the index of a word which have word vector is not 0
        w2indx = {v: k + 1 for k, v in gensim_dict.items()}
        # integrate all the corresponding word vectors into the word vector matrix
        w2vec = {word: model[word] for word in w2indx.keys()}

        # 对文本按字典生成索引值
        def parse_dataset(combined):
            data = []
            for sentence in combined:
                new_txt = []
                for word in sentence:
                    try:
                        new_txt.append(w2indx[word])
                    except:
                        new_txt.append(0)
                data.append(new_txt)
            return data

        # 生成索引值列表
        combined_index = parse_dataset(combined)
        # 对列表进行填充，不足maxlen的从前面填充0，超过maxlen的从后往前截断，并且要求至少是二维
        combined_pad = sequence.pad_sequences(combined_index, maxlen=maxlen)
        return w2indx, w2vec, combined_pad
    else:
        print('No data provided...')


# 训练词向量
def word2vec_train(combined, vocab_dim, n_exposures, window_size, n_iterations, maxlen):
    # cpu_count = multiprocessing.cpu_count()
    # model = Word2Vec(size=vocab_dim,           # 词向量维度
    #                  min_count=n_exposures,    # 对字典做截断,词频少于min_count次数的单词会被丢弃掉, 默认值为5
    #                  window=window_size,       # 当前词与预测词的最大距离
    #                  workers=cpu_count,        # 训练并行数
    #                  iter=n_iterations,        # 迭代次数，默认为5
    #                  sg=1)                     # 设置训练算法，默认为0，对应CBOW算法，sg=1则采用skip-gram算法。
    # # 建立词语字典
    # model.build_vocab(combined)

    # online learning 继续更新模型的参数
    # model.train(combined, total_examples=model.corpus_count, epochs=50)

    # 保存模型
    # model.save('model/Word2vec_model.pkl')
    model = Word2Vec.load('model/Word2vec_model.pkl')

    # 将文本转为索引表示
    index_dict, word_vectors, combined = create_dictionaries(maxlen, model=model, combined=combined)
    return index_dict, word_vectors, combined


def get_data(index_dict, word_vectors, vocab_dim, combined, y):
    # 单词表长度，0代表省略的填充值，所以长度+1
    n_symbols = len(index_dict) + 1

    # 从索引为1的词语开始，制作词向量权重，直接用于embedding层
    embedding_weights = np.zeros((n_symbols, vocab_dim))
    for word, index in index_dict.items():
        embedding_weights[index, :] = word_vectors[word]

    # 制作训练集与测试集
    x_train, x_test, y_train, y_test = train_test_split(combined, y, test_size=0)
    return n_symbols, embedding_weights, x_train, y_train, x_test, y_test


# 构建LSTM网络
def train_lstm(n_symbols, vocab_dim, maxlen, n_iterations, n_exposures, window_size, lstm_dim, embedding_weights, x_train, y_train, x_test, y_test):
    model = Sequential()
    # 如果输入数据不需要词的语义特征语义，简单使用Embedding层就可以得到一个对应的词向量矩阵，
    # 但如果需要语义特征，可以把已经训练好的词向量权重直接输入Embedding层
    model.add(Embedding(input_dim=n_symbols,           # 字典长度
                        output_dim=vocab_dim,          # 词向量维度
                        mask_zero=True,                # 是否开启0过滤
                        weights=[embedding_weights],   # 词向量权重
                        input_length=maxlen))          # 固定的输入序列长度
    model.add(LSTM(output_dim=lstm_dim, activation='sigmoid', inner_activation='hard_sigmoid'))
    model.add(Dropout(0.5))
    model.add(Dense(1))
    model.add(Activation('sigmoid'))
    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    # estimator = KerasClassifier(build_fn=model, epochs=n_epoch, batch_size=batch_size, verbose=1)
    history = model.fit(x_train, y_train, validation_split=0.2, batch_size=batch_size, epochs=n_epoch, verbose=1)
    # score = model.evaluate(x_test, y_test, batch_size=batch_size)

    # 保存模型
    yaml_string = model.to_yaml()
    with open('model/lstm.yml', 'w') as outfile:
        outfile.write(yaml.dump(yaml_string, default_flow_style=True))

    # 保存参数
    model.save_weights('model/lstm.h5')

    # 输出测试集精度
    # print('Test Accuracy:', score)
    plot_model(history.history, vocab_dim, maxlen, n_iterations, n_exposures, window_size, lstm_dim)

    return history.history['val_acc'][-1]


# 训练模型，并保存
def train(dataset, label, vocab_dim, n_exposures, window_size, n_iterations, maxlen, lstm_dim):
    # 训练词向量
    index_dict, word_vectors, combined = word2vec_train(dataset, vocab_dim, n_exposures, window_size, n_iterations, maxlen)

    # 制作测试集与训练集
    n_symbols, embedding_weights, x_train, y_train, x_test, y_test = get_data(index_dict, word_vectors, vocab_dim, combined, label)

    # 训练LSTM网络
    return train_lstm(n_symbols, vocab_dim, maxlen, n_iterations, n_exposures, window_size, lstm_dim,
                      embedding_weights, x_train, y_train, x_test, y_test)


# 输入文本转为索引表
def input_transform(string, name):
    # 分词
    results, pos = cut(string)
    for i in range(len(results)):
        if pos[i] in ['TIME', 'PER', 'ORG', 'LOC', 'nr', 'nz', 'ns', 'nt', 'm']:
            if results[i] == name:
                results[i] = '他'
            else:
                results[i] = pos[i]

    # 转为二维矩阵
    # print(results)
    words = np.array(results).reshape(1, -1)
    # 加载模型
    model = Word2Vec.load('model/Word2vec_model.pkl')

    # 查找词汇表，转为索引表
    _, _, combined = create_dictionaries(30, model, words)
    return combined


# 模型预测
def predict(string, name):
    # 加载LSTM模型
    with open('model/lstm.yml', 'r') as f:
        yaml_string = yaml.load(f)
    model = model_from_yaml(yaml_string)

    # 加载训练参数
    model.load_weights('model/lstm.h5')
    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    # 数据转换
    data = input_transform(string, name)

    # 预测类别
    result = model.predict_classes(data)
    return result[0][0]


# 训练新模型
def train_model():
    # # 加载数据
    # train, label, name = loadfile()
    #
    # # 数据预处理
    # combined = tokenizer(train, name)
    #
    # # 存储训练数据
    # f_x = open("train_X.txt", 'w+', encoding='utf-8')
    # f_y = open("train_Y.txt", 'w+', encoding='utf-8')
    # for com in combined:
    #     for c in com:
    #         f_x.write(c + ' ')
    #     f_x.write('\n')
    # for y in label:
    #     f_y.write(str(y) + ' ')

    # 读取训练数据
    combined = []
    lines = open("train_X.txt", encoding='utf-8').readlines()
    for line in lines:
        temp = line.split(' ')
        temp.remove('\n')
        combined.append(temp)
    line = open("train_Y.txt", encoding='utf-8').readline()
    label = line.split(' ')
    label.remove(label[-1])
    for i in range(len(label)):
        label[i] = int(label[i])
    lines = open("train_X1.txt", encoding='utf-8').readlines()
    for line in lines:
        line = line.replace('\n', '')
        line = line.split('   ')[1]
        temp = line.split(' ')
        label.append(int(temp[-1]))
        temp.remove(temp[-1])
        combined.append(temp)

    # GridSearch
    gsearch = GridSearch({'vocab_dim': [300], 'maxlen': [30],
                          'n_iterations': [100], 'n_exposures': [5],
                          'window_size': [7], 'lstm_dim': [512]})
    gsearch.fit(dataset=combined, label=label)


def get_file(name):
    lines = open("D:/test/%s.txt" % name, encoding='utf-8').readlines()
    file = open("D:/extract/%s.txt" % name, 'w+', encoding='utf-8')
    for line in lines:
        line = line.encode('utf-8').decode('utf-8-sig')
        time.sleep(TIME)
        # k.clear_session()
        print(line)
        # try:
        if predict(line, name):
            file.write(line)
        # except:
        #     print("{0} {1} 抽取失败！！".format(name, line))
        #     k.clear_session()


if __name__ == '__main__':
     # train_model()
     
    get_file("顾世廉")

