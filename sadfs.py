import psycopg2
import requests

# 1. Ваши данные (Имя, Тип, Адрес для геокодинга)
locations_data = [
    ("Новая Голландия", "space", "Санкт-Петербург, набережная Адмиралтейского канала, 2"),
    ("Севкабель Порт", "space", "Санкт-Петербург, Кожевенная линия, 40"),
    ("Дворцовая площадь", "square", "Санкт-Петербург, Дворцовая площадь"),
    ("Казанский собор", "sight", "Санкт-Петербург, Казанская площадь, 2"),
    ("Исаакиевский собор", "sight", "Санкт-Петербург, Исаакиевская площадь, 4"),
    ("Летний сад", "park", "Санкт-Петербург, Летний сад"),
    ("Парк Сосновка", "park", "Санкт-Петербург, Выборгский район, парк Сосновка"),
    # ... сюда можно вставить все 100 текстовых адресов из предыдущего списка
]

# 2. Подключение к вашей БД
conn = psycopg2.connect(
    dbname="postgres", user="postgres", password="seriva123_A", host="localhost"
)
cursor = conn.cursor()

# 3. Бесплатный геокодер (в примере OSM, для Яндекса нужен бесплатный ключ API)
for name, loc_type, address in locations_data:
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1"
        headers = {'User-Agent': 'SpbLocationImporter/1.0'}
        response = requests.get(url, headers=headers).json()
        
        if response:
            lon = float(response[0]['lon'])
            lat = float(response[0]['lat'])
            
            # Запись строго в формате PostGIS Geometry
            query = """
                INSERT INTO locations (name, type, coordinates, description, is_popular)
                VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, true);
            """
            cursor.execute(query, (name, loc_type, lon, lat, address))
            print(f"Успешно добавлен: {name} ({lat}, {lon})")
    except Exception as e:
        print(f"Ошибка геокодинга для {name}: {e}")

conn.commit()
cursor.close()
conn.close()